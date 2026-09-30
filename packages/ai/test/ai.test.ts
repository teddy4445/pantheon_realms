import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { builtBuildingIds, canonicalStateHash, deepClone, legalActions, processCommand, type GameCommand } from '@pr/rules';
import { buildObservation, chooseBattleAction, runAITurn, strategicCandidates } from '../src';

const SKIRMISH = 'skirmish_twin_harbors';

describe('AI observation (belief state)', () => {
  it('hides the other side’s wallet, fog and unseen heroes', () => {
    const d = GameDriver.mission(SKIRMISH);
    const rival = d.state.playerOrder.find((p) => d.state.players[p]!.controller === 'ai')!;
    const human = d.state.playerOrder.find((p) => p !== rival)!;
    const obs = buildObservation(d.catalog, d.state, rival);
    expect(obs.belief.players[human]!.wallet.gold).toBe(0);
    expect(obs.belief.fog[human]).toBeUndefined();
    const humanHero = Object.values(d.state.heroes).find((h) => h.ownerId === human)!;
    // The human hero starts far outside the rival's vision.
    expect(obs.belief.heroes[humanHero.id]).toBeUndefined();
    // The real state is untouched.
    expect(d.state.players[human]!.wallet.gold).toBeGreaterThan(0);
  });
});

describe('strategic AI', () => {
  it('only proposes commands the processor accepts or rejects cleanly, and develops its empire', () => {
    const d = GameDriver.mission(SKIRMISH);
    const rival = d.state.playerOrder.find((p) => d.state.players[p]!.controller === 'ai')!;
    const rivalTown = Object.values(d.state.towns).find((t) => t.ownerId === rival)!;
    const builtBefore = builtBuildingIds(d.catalog, rivalTown).length;
    const rivalHeroId = Object.values(d.state.heroes).find((h) => h.ownerId === rival)!.id;
    // The human side stays passive; the rival may even win outright, which ends the loop early.
    for (let day = 0; day < 6 && d.state.outcome.status === 'running'; day++) d.endDay();
    const town = d.state.towns[rivalTown.id]!;
    expect(builtBuildingIds(d.catalog, town).length).toBeGreaterThan(builtBefore);
    // The rival hero explored/collected (it may return home to reinforce, so count movement events).
    expect(d.events.filter((e) => e.kind === 'HeroMoved' && e.heroId === rivalHeroId).length).toBeGreaterThan(0);
    // Candidate commands are well-formed: submitting each against the current state never throws.
    const obs = buildObservation(d.catalog, d.state, rival);
    for (const c of d.state.outcome.status === 'running' ? strategicCandidates(d.catalog, obs).slice(0, 25) : []) {
      const cmd = { ...c, commandId: `probe:${c.kind}`, expectedRevision: d.state.revision, actorPlayerId: rival } as GameCommand;
      expect(() => processCommand({ catalog: d.catalog }, d.state, cmd)).not.toThrow();
    }
  });

  it('hires a hero when it has a Tavern, spare Gold and a free visitor position', () => {
    const d = GameDriver.mission(SKIRMISH);
    const rival = d.state.playerOrder.find((p) => d.state.players[p]!.controller === 'ai')!;
    // Planner fixture: the rival's hero has left town (a planner input, not a processed state).
    const fixture = deepClone(d.state);
    const hero = Object.values(fixture.heroes).find((h) => h.ownerId === rival)!;
    hero.position = { q: hero.position.q - 2, r: hero.position.r };
    fixture.activePlayerId = rival;
    const candidates = strategicCandidates(d.catalog, buildObservation(d.catalog, fixture, rival));
    expect(candidates.some((c) => c.kind === 'HireHero')).toBe(true);
  });

  it('never offers to hire a hero the rival already fields, even when that hero is out of sight', () => {
    const d = GameDriver.mission(SKIRMISH);
    const fixture = deepClone(d.state);
    const alexios = fixture.heroes['alexios']!;
    alexios.position = { q: alexios.position.q + 2, r: alexios.position.r }; // free the visitor position
    const obs = buildObservation(d.catalog, fixture, 'player');
    // The rival's leader is hidden from the player's belief …
    expect(obs.belief.heroes['rival_odysseus']).toBeUndefined();
    // … but the Tavern roster is the true one, so the AI never proposes a hire the rules would refuse.
    const hires = strategicCandidates(d.catalog, obs).filter((c) => c.kind === 'HireHero');
    expect(hires.length).toBe(1);
    expect(hires.every((c) => c.kind === 'HireHero' && c.heroDefinitionId !== 'odysseus')).toBe(true);
    const cmd = { ...hires[0]!, commandId: 'hire', expectedRevision: fixture.revision, actorPlayerId: 'player' } as GameCommand;
    expect(processCommand({ catalog: d.catalog }, fixture, cmd).ok).toBe(true);
  });

  it('goes out to hunt a weak raider near its town instead of hiding behind the walls', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const east = s.towns['eastharbor']!.coord;
    // A lone, weak enemy hero inside the threat radius of Eastharbor.
    s.heroes['alexios']!.position = { q: east.q - 3, r: east.r };
    s.heroes['alexios']!.army.slots = [{ creatureId: 'hoplite', count: 4 }, null, null, null, null, null, null];
    s.activePlayerId = 'rival';
    const cands = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'rival'));
    expect(cands).toContainEqual({ kind: 'MoveHero', heroId: 'rival_odysseus', destination: s.heroes['alexios']!.position, confirmEncounter: true });
  });

  it('does not end a move within reach of a visible, stronger enemy hero', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const gold = d.catalog.missions[SKIRMISH]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    // The rival hero waits next to the gold mine with a much larger army.
    s.heroes['rival_odysseus']!.position = { q: gold.q + 2, r: gold.r };
    s.heroes['rival_odysseus']!.army.slots = [{ creatureId: 'hoplite', count: 80 }, { creatureId: 'peltast', count: 30 }, null, null, null, null, null];
    // Alexios is close enough to see it (vision 5) and could reach the mine this turn.
    s.heroes['alexios']!.position = { q: gold.q - 3, r: gold.r };
    s.heroes['alexios']!.movementPoints = 2000;
    const obs = buildObservation(d.catalog, s, 'player');
    expect(obs.belief.heroes['rival_odysseus']).toBeDefined();
    const cands = strategicCandidates(d.catalog, obs);
    const toGold = cands.find((c) => c.kind === 'MoveHero' && c.heroId === 'alexios' && c.destination.q === gold.q && c.destination.r === gold.r);
    expect(toGold).toBeUndefined();
    // Control: with the enemy out of sight the same hero does go for the mine.
    delete s.heroes['rival_odysseus'];
    const calm = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'player'));
    expect(calm.some((c) => c.kind === 'MoveHero' && c.heroId === 'alexios' && c.destination.q === gold.q && c.destination.r === gold.r)).toBe(true);
  });

  it('besieges a visible, weakly garrisoned enemy town and holds a threatened town', () => {
    const d = GameDriver.mission(SKIRMISH);
    const rival = 'rival';
    const fixture = deepClone(d.state);
    for (const fog of Object.values(fixture.fog)) fog.explored = fog.explored.map(() => 1);
    const west = fixture.towns['westharbor']!;
    west.garrison.slots[0] = { creatureId: 'hoplite', count: 2 };
    const alexios = fixture.heroes['alexios']!;
    alexios.position = { q: 9, r: 3 }; // away from town, outside the rival's threat radius
    const hero = fixture.heroes['rival_odysseus']!;
    hero.position = { q: 6, r: 8 };
    hero.movementPoints = 2000;
    hero.army.slots[0] = { creatureId: 'hoplite', count: 40 };
    fixture.activePlayerId = rival;
    const candidates = strategicCandidates(d.catalog, buildObservation(d.catalog, fixture, rival));
    expect(candidates).toContainEqual({ kind: 'MoveHero', heroId: hero.id, destination: west.coord, confirmEncounter: true });

    // Defence: an enemy hero near Eastharbor keeps the visitor at home and recruits into the garrison.
    const home = deepClone(d.state);
    for (const fog of Object.values(home.fog)) fog.explored = fog.explored.map(() => 1);
    // Same army as the visitor, within the threat radius: the visitor cannot win in the field, so it holds.
    const east = home.towns['eastharbor']!.coord;
    home.heroes['alexios']!.position = { q: east.q - 5, r: east.r };
    home.activePlayerId = rival;
    const defence = strategicCandidates(d.catalog, buildObservation(d.catalog, home, rival));
    expect(defence.some((c) => c.kind === 'MoveHero' && c.heroId === 'rival_odysseus')).toBe(false);
    expect(defence.filter((c) => c.kind === 'RecruitUnits').every((c) => c.kind === 'RecruitUnits' && c.destination.kind === 'garrison')).toBe(true);
  });

  it('is deterministic across identical runs', () => {
    const run = () => {
      const d = GameDriver.mission(SKIRMISH, { matchId: 'ai-determinism' });
      for (let day = 0; day < 4 && d.state.outcome.status === 'running'; day++) d.endDay();
      return canonicalStateHash(d.state);
    };
    expect(run()).toBe(run());
  });
});

describe('tactical AI', () => {
  it('always chooses an action the processor accepts', () => {
    const d = GameDriver.mission('three_beacons_m01');
    d.marchTo({ q: 9, r: 7 });
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
    expect(d.state.battle).not.toBeNull();
    let steps = 0;
    while (d.state.battle && steps < 200) {
      const la = legalActions(d.catalog, d.state);
      expect(la).not.toBeNull();
      const payload = chooseBattleAction(d.catalog, d.state)!;
      expect(payload).not.toBeNull();
      const side = d.state.battle.sides[la!.side];
      const actor = side.playerId ?? '__neutral__';
      const cmd = { ...payload, commandId: `tac${steps}`, expectedRevision: d.state.revision, actorPlayerId: actor } as GameCommand;
      const res = processCommand({ catalog: d.catalog }, d.state, cmd);
      if (!res.ok) throw new Error(`tactical AI chose an illegal action: ${res.rejection.code} ${res.rejection.message}`);
      d.state = res.state;
      steps++;
    }
    expect(d.state.battle).toBeNull();
    expect(d.state.lastBattleResult?.winner).toBe('attacker');
  });
});

const LEADER: Record<string, string> = { norse: 'ragnar', egyptian: 'hatshepsut', japanese: 'yoshitsune', celtic: 'fionn', mesoamerican: 'nezahualcoyotl' };
const PATRON: Record<string, string> = { norse: 'norse_odin', egyptian: 'egyptian_ra', japanese: 'japanese_amaterasu', celtic: 'celtic_dagda', mesoamerican: 'mesoamerican_quetzalcoatl' };

describe.each(Object.keys(LEADER))('%s skirmish (content, not code)', (pid) => {
  it('plays the pantheon with the unchanged rules and AI', () => {
    const d = GameDriver.mission(`skirmish_twin_harbors_${pid}_vs_greek`, { startingGodId: PATRON[pid]! });
    const town = d.state.towns['westharbor']!;
    const leader = LEADER[pid]!;
    expect(town.pantheonId).toBe(pid);
    const p = d.catalog.pantheons[pid]!;
    const t1 = d.catalog.families[p.roster[0]!.familyId]!;
    const start = d.state.heroes[leader]!.army.slots[0]!.count;
    // Human side: build a marketplace, recruit tier 1, leave town and hire a second hero.
    const market = d.catalog.townArchetypes[town.archetypeId]!.slots.find((s) => s.id === 'marketplace')!.chain[0]!;
    d.do({ kind: 'BuildStructure', townId: town.id, buildingId: market });
    d.do({ kind: 'RecruitUnits', townId: town.id, creatureId: t1.baseCreatureId, quantity: 5, destination: { kind: 'hero', heroId: leader } });
    expect(d.state.heroes[leader]!.army.slots[0]).toMatchObject({ creatureId: t1.baseCreatureId, count: start + 5 });
    d.marchTo({ q: town.coord.q + 1, r: town.coord.r }, leader);
    const other = p.heroIds.find((h) => h !== d.state.heroes[leader]!.definitionId)!;
    d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: other });
    const hired = Object.values(d.state.heroes).find((h) => h.definitionId === other)!;
    expect(hired.army.slots[0]).toMatchObject({ creatureId: t1.baseCreatureId, count: 10 });
    // Let the Greek AI play a few days against it; every command goes through the processor.
    for (let i = 0; i < 3 && d.state.outcome.status === 'running'; i++) d.endDay();
    expect(d.state.day).toBeGreaterThan(1);
  });

  it('builds the whole town and recruits every creature through the command processor', () => {
    const d = GameDriver.mission(`skirmish_twin_harbors_${pid}_vs_greek`, { startingGodId: PATRON[pid]! });
    const s = structuredClone(d.state);
    s.players['player']!.wallet = { gold: 10_000_000, wood: 100_000, stone: 100_000, crystal: 100_000, favor: 1000 };
    d.state = s;
    const town = d.state.towns['westharbor']!;
    const arch = d.catalog.townArchetypes[town.archetypeId]!;
    const implemented = arch.slots.flatMap((sl) => sl.chain).filter((id) => d.catalog.buildings[id]!.implementationStatus === 'implemented');
    const tryDo = (payload: Parameters<GameDriver['do']>[0], actor = 'player', apply = true) => {
      const res = processCommand({ catalog: d.catalog }, d.state, d.command(payload, actor));
      if (res.ok && apply) d.state = res.state;
      return res.ok;
    };
    // The rival stays passive (ends its turns) so the run measures content, not a battle.
    for (let day = 0; day < 60 && builtBuildingIds(d.catalog, d.state.towns['westharbor']!).length < implemented.length; day++) {
      for (const id of implemented) if (!builtBuildingIds(d.catalog, d.state.towns['westharbor']!).includes(id)) tryDo({ kind: 'BuildStructure', townId: town.id, buildingId: id });
      tryDo({ kind: 'EndTurn' });
      tryDo({ kind: 'EndTurn' }, 'rival');
    }
    expect([...builtBuildingIds(d.catalog, d.state.towns['westharbor']!)].sort()).toEqual([...implemented].sort());
    // After a week of growth every base and upgraded creature can be recruited.
    for (let i = 0; i < 7; i++) {
      tryDo({ kind: 'EndTurn' });
      tryDo({ kind: 'EndTurn' }, 'rival');
    }
    for (const r of d.catalog.pantheons[pid]!.roster) {
      const f = d.catalog.families[r.familyId]!;
      for (const cid of [f.baseCreatureId, f.upgradedCreatureId]) {
        // Checked one at a time against the same state (a garrison holds only seven stacks).
        expect(tryDo({ kind: 'RecruitUnits', townId: town.id, creatureId: cid, quantity: 1, destination: { kind: 'garrison' } }, 'player', false), cid).toBe(true);
      }
    }
    // The minor-god pair is committable once Temple II stands.
    const minor = d.catalog.pantheons[pid]!.godIds.find((g) => d.catalog.gods[g]!.role === 'minor')!;
    expect(tryDo({ kind: 'SelectGod', godId: minor })).toBe(true);
  });
});
