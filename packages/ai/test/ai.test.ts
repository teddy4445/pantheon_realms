import { heroStartingArmy } from '@pr/rules';
import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { axialDistance, builtBuildingIds, canonicalStateHash, deepClone, footprintDistance, legalActions, processCommand, stackCells, type GameCommand, type HexCoord } from '@pr/rules';
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

  it('steps back out of reach when a much stronger enemy is in view', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const gold = d.catalog.missions[SKIRMISH]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    const enemy = s.heroes['rival_odysseus']!;
    enemy.position = { q: gold.q + 1, r: gold.r };
    enemy.army.slots = [{ creatureId: 'hoplite', count: 80 }, { creatureId: 'peltast', count: 30 }, null, null, null, null, null];
    // Alexios already stands next to that army (it came into view during his move).
    s.heroes['alexios']!.position = { q: gold.q - 2, r: gold.r };
    s.heroes['alexios']!.movementPoints = 900;
    const cands = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'player'));
    const move = cands.find((c) => c.kind === 'MoveHero' && c.heroId === 'alexios');
    expect(move).toBeDefined();
    const dest = (move as { destination: HexCoord }).destination;
    expect(axialDistance(dest, enemy.position)).toBeGreaterThan(axialDistance(s.heroes['alexios']!.position, enemy.position));
  });

  it('keeps a weak secondary hero on its own half of the map unless it walks beside the main army', () => {
    const d = GameDriver.mission(SKIRMISH);
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const west = s.towns['westharbor']!.coord;
    const east = s.towns['eastharbor']!.coord;
    const main = s.heroes['alexios']!;
    main.army.slots = [{ creatureId: 'hoplite', count: 60 }, { creatureId: 'peltast', count: 20 }, null, null, null, null, null];
    // A scout with a handful of Hoplites stands at the middle of the map.
    const scout = deepClone(main);
    scout.id = 'scout';
    scout.name = 'Scout';
    scout.army.slots = [{ creatureId: 'hoplite', count: 5 }, null, null, null, null, null, null];
    scout.position = { q: Math.round((west.q + east.q) / 2), r: west.r };
    scout.movementPoints = 2000;
    s.heroes['scout'] = scout;
    const cands = strategicCandidates(d.catalog, buildObservation(d.catalog, s, 'player'));
    const scoutMoves = cands.filter((c) => c.kind === 'MoveHero' && c.heroId === 'scout') as { destination: HexCoord }[];
    expect(scoutMoves.length).toBeGreaterThan(0); // it still has work on its own half
    for (const m of scoutMoves) {
      const enemyHalf = axialDistance(m.destination, east) < axialDistance(m.destination, west);
      if (enemyHalf) expect(axialDistance(m.destination, main.position)).toBeLessThanOrEqual(3);
    }
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

describe('tactical AI: advancing', () => {
  it('a fast flyer that cannot strike yet stops outside the enemy line’s reach instead of landing alone in it', () => {
    const d = GameDriver.mission(SKIRMISH, { matchId: 'lone-flyer' });
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const a = s.heroes['alexios']!;
    const b = s.heroes['rival_odysseus']!;
    a.army.slots = [{ creatureId: 'windcrest_griffin', count: 4 }, { creatureId: 'hoplite', count: 20 }, null, null, null, null, null];
    b.army.slots = [{ creatureId: 'hoplite', count: 20 }, { creatureId: 'hoplite', count: 20 }, null, null, null, null, null];
    const gold = d.catalog.missions[SKIRMISH]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    b.position = { q: gold.q - 4, r: gold.r };
    a.position = { q: gold.q - 5, r: gold.r };
    a.movementPoints = 5000;
    d.state = s;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: b.position, confirmEncounter: true });
    const battle = deepClone(d.state.battle!);
    const stacks = Object.values(battle.stacks);
    const griffin = stacks.find((x) => x.creatureId === 'windcrest_griffin')!;
    const ally = stacks.find((x) => x.side === griffin.side && x.id !== griffin.id)!;
    const foes = stacks.filter((x) => x.side !== griffin.side);
    griffin.anchor = { col: 0, row: 5 };
    ally.anchor = { col: 0, row: 0 };
    foes[0]!.anchor = { col: 14, row: 4 };
    foes[1]!.anchor = { col: 14, row: 6 };
    battle.phase = 'normal';
    battle.activeStackId = griffin.id;
    const fixture = { ...d.state, battle };
    const la = legalActions(d.catalog, fixture)!;
    expect(la.melee.length).toBe(0); // out of striking range this activation
    const choice = chooseBattleAction(d.catalog, fixture)!;
    expect(choice.kind).toBe('BattleMove');
    const to = (choice as { to: { col: number; row: number } }).to;
    const cells = stackCells(d.catalog, griffin, to);
    // Hoplites move 4 and strike from an adjacent cell: stay at least 6 cells away from each.
    for (const f of foes) expect(footprintDistance(cells, stackCells(d.catalog, f))).toBeGreaterThan(5);
    // …while still advancing.
    expect(to.col).toBeGreaterThan(griffin.anchor.col);
  });

  it('a shooter with no enemy in range holds while melee troops approach, and steps only into range when it can', () => {
    const d = GameDriver.mission(SKIRMISH, { matchId: 'short-range' });
    const s = deepClone(d.state);
    for (const fog of Object.values(s.fog)) fog.explored = fog.explored.map(() => 1);
    const a = s.heroes['alexios']!;
    const b = s.heroes['rival_odysseus']!;
    a.army.slots = [{ creatureId: 'hill_slinger', count: 20 }, { creatureId: 'hoplite', count: 20 }, null, null, null, null, null];
    b.army.slots = [{ creatureId: 'hoplite', count: 20 }, null, null, null, null, null, null];
    const gold = d.catalog.missions[SKIRMISH]!.sites.find((x) => x.id === 'sk_gold')!.coord;
    b.position = { q: gold.q - 4, r: gold.r };
    a.position = { q: gold.q - 5, r: gold.r };
    a.movementPoints = 5000;
    d.state = s;
    d.do({ kind: 'MoveHero', heroId: 'alexios', destination: b.position, confirmEncounter: true });
    const battle = deepClone(d.state.battle!);
    const stacks = Object.values(battle.stacks);
    const slinger = stacks.find((x) => x.creatureId === 'hill_slinger')!;
    const ally = stacks.find((x) => x.side === slinger.side && x.id !== slinger.id)!;
    const foe = stacks.find((x) => x.side !== slinger.side)!;
    ally.anchor = { col: 0, row: 2 };
    battle.phase = 'normal';
    battle.activeStackId = slinger.id;
    const decide = (slingerAt: { col: number; row: number }, foeAt: { col: number; row: number }) => {
      slinger.anchor = slingerAt;
      foe.anchor = foeAt;
      const fixture = { ...d.state, battle };
      expect(legalActions(d.catalog, fixture)!.shootTargets).toEqual([]);
      return chooseBattleAction(d.catalog, fixture)!;
    };
    // Range 9, speed 5: an enemy across the field cannot be brought into range this turn — hold.
    expect(decide({ col: 0, row: 0 }, { col: 14, row: 10 }).kind).toBe('BattleDefend');
    // 11 hexes away: step forward just far enough to shoot, never next to the enemy.
    const step = decide({ col: 3, row: 5 }, { col: 14, row: 5 });
    expect(step.kind).toBe('BattleMove');
    const cells = stackCells(d.catalog, slinger, (step as { to: { col: number; row: number } }).to);
    const gap = footprintDistance(cells, stackCells(d.catalog, foe));
    expect(gap).toBeLessThanOrEqual(9);
    expect(gap).toBeGreaterThan(1);
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
    // Out of the town's gate (one step past it), so the Tavern can place a new hero there.
    d.marchTo({ q: town.coord.q + 2, r: town.coord.r }, leader);
    const other = p.heroIds.find((h) => h !== d.state.heroes[leader]!.definitionId)!;
    d.do({ kind: 'HireHero', townId: town.id, heroDefinitionId: other });
    const hired = Object.values(d.state.heroes).find((h) => h.definitionId === other)!;
    expect(hired.army.slots[0]).toMatchObject(heroStartingArmy(d.catalog, other)[0]!);
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
