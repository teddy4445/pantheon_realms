import { describe, expect, it } from 'vitest';
import { GameDriver } from '@pr/testing';
import { canonicalStateHash, checkBattleEnd, createIllusion, expireTemporaryLife, illusionDestinations, legalActions, permanentHp, previewStrike, resolveStackDamage, statsOf, Tx } from '../src';

function setup() {
  const d = GameDriver.mission('three_beacons_m01');
  d.state.scenario.features = { ...d.state.scenario.features!, mythicLibraryV2: true };
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 8, r: 7 } });
  d.do({ kind: 'MoveHero', heroId: 'alexios', destination: { q: 10, r: 7 }, confirmEncounter: true });
  const b = d.state.battle!, allies = Object.values(b.stacks).filter((s) => s.side === 'attacker');
  const ally = allies[0]!, other = allies[1]!, enemy = Object.values(b.stacks).find((s) => s.side === 'defender')!;
  b.activeStackId = ally.id; b.obstacles = [];
  b.sides.attacker.commander!.spellbook = true;
  b.sides.attacker.commander!.knownSpellIds = ['spell2_door_duat', 'spell2_xolotls_twin', 'spell2_spellground'];
  d.state.heroes.alexios!.mana = 100;
  return { d, b, ally, other, enemy };
}

describe('temporary battle life', () => {
  it('restores separate temporary HP, consumes that HP first, and never creates duplicate kill XP', () => {
    const { d, ally } = setup();
    const hp = statsOf(d.catalog, ally.creatureId).hp;
    ally.totalHp = hp * 2; ally.killedByEnemy = ally.startingCount - 2;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_door_duat', targetId: ally.id });
    d.state = JSON.parse(JSON.stringify(d.state));
    const b = d.state.battle!, t = b.stacks[ally.id]!, temp = t.temporaryLife!.hp, kills = t.killedByEnemy;
    expect(permanentHp(t)).toBe(hp * 2);
    const tx = new Tx({ catalog: d.catalog }, d.state, 'player');
    resolveStackDamage(tx, b, t, temp + hp);
    expect(permanentHp(t)).toBe(hp);
    expect(t.killedByEnemy).toBe(kills + 1);
    expect(t.temporaryLife).toBeUndefined();
  });
  it('expires restored HP without kills and refuses an occupied fallen footprint atomically', () => {
    const { d, ally, other } = setup();
    ally.totalHp = 0; const from = { ...other.anchor }; other.anchor = { ...ally.anchor };
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_door_duat', targetId: ally.id });
    expect(canonicalStateHash(d.state)).toBe(before);
    other.anchor = from;
    d.state.battle!.activeStackId = other.id;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_door_duat', targetId: ally.id });
    const b = d.state.battle!, t = b.stacks[ally.id]!;
    expect(t.totalHp).toBeGreaterThan(0);
    expect(permanentHp(t)).toBe(0);
    const kills = t.killedByEnemy;
    expireTemporaryLife(new Tx({ catalog: d.catalog }, d.state, 'player'), b, b.round + 2);
    expect(t.totalHp).toBe(0); expect(t.killedByEnemy).toBe(kills);
  });
  it('creates one fragile copy with a legal footprint, quarter physical damage, no abilities and no retaliation', () => {
    const { d, ally, enemy } = setup();
    const destination = illusionDestinations(d.catalog, d.state.battle!, ally)[0]!;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_xolotls_twin', targetId: ally.id, destination });
    const b = d.state.battle!, copy = Object.values(b.stacks).find((s) => s.summoned)!;
    expect(copy.totalHp).toBe(1);
    expect(illusionDestinations(d.catalog, b, b.stacks[ally.id]!)).toEqual([]);
    const originalPreview = previewStrike(d.catalog, b, b.stacks[ally.id]!, b.stacks[enemy.id]!, { mode: 'melee', chargeHexes: 0 });
    const copyPreview = previewStrike(d.catalog, b, copy, b.stacks[enemy.id]!, { mode: 'melee', chargeHexes: 0 });
    expect(copyPreview.max).toBe(Math.max(1, Math.floor(originalPreview.max / 4)));
    b.activeStackId = copy.id;
    expect(legalActions(d.catalog, d.state)!.abilities).toEqual([]);
    b.sides.attacker.armyBarrier = 100;
    resolveStackDamage(new Tx({ catalog: d.catalog }, d.state, 'player'), b, copy, 1, true);
    expect(copy.totalHp).toBe(0); expect(copy.killedByEnemy).toBe(0);
    expect(b.sides.attacker.armyBarrier).toBe(100);
  });
  it('Spellground refuses recruited troops and dismisses an opposing illusion without XP', () => {
    const { d, b, ally, enemy } = setup();
    const before = canonicalStateHash(d.state);
    d.reject({ kind: 'BattleCastSpell', spellId: 'spell2_spellground', targetId: enemy.id });
    expect(canonicalStateHash(d.state)).toBe(before);
    const to = illusionDestinations(d.catalog, b, enemy)[0]!;
    createIllusion(new Tx({ catalog: d.catalog }, d.state, 'player'), b, enemy, to, 2);
    const copy = Object.values(b.stacks).find((s) => s.summoned)!;
    b.activeStackId = ally.id;
    d.do({ kind: 'BattleCastSpell', spellId: 'spell2_spellground', targetId: copy.id });
    expect(d.state.battle!.stacks[copy.id]!.totalHp).toBe(0);
    expect(d.state.battle!.stacks[copy.id]!.killedByEnemy).toBe(0);
  });
  it('adds surviving split fragments back to their original army slot exactly once',()=>{
    const {d,b,ally}=setup(); const hp=statsOf(d.catalog,ally.creatureId).hp;
    ally.startingCount=12;ally.totalHp=7*hp;
    b.stacks.split={...structuredClone(ally),id:'split',startingCount:8,totalHp:3*hp,anchor:{col:2,row:6}};
    for(const st of Object.values(b.stacks))if(st.side==='defender')st.totalHp=0;
    const tx=new Tx({catalog:d.catalog},d.state,'player');checkBattleEnd(tx,b);
    expect(d.state.heroes.alexios!.army.slots[ally.sourceSlot]!.count).toBe(10);
  });
  it('living recovery is capped, excludes extinct and nonliving stacks, and persists only actual survivors',()=>{
    const {d,b,ally,other}=setup();const hp=statsOf(d.catalog,ally.creatureId).hp;
    b.sides.attacker.effects!.library=[{type:'library_living_recovery',percent:10}];
    b.sides.attacker.effects!.recoveryPercent=0;
    ally.startingCount=100;ally.totalHp=10*hp;other.startingCount=100;other.totalHp=0;
    for(const st of Object.values(b.stacks))if(st.side==='defender')st.totalHp=0;
    const tx=new Tx({catalog:d.catalog},d.state,'player');checkBattleEnd(tx,b);
    expect(d.state.heroes.alexios!.army.slots[ally.sourceSlot]!.count).toBe(19);
    expect(d.state.heroes.alexios!.army.slots[other.sourceSlot]).toBeNull();
  });
  it('temporary bodies cannot postpone defeat or persist as army survivors', () => {
    const { d, b, ally, enemy } = setup();
    createIllusion(new Tx({ catalog: d.catalog }, d.state, 'player'), b, enemy, illusionDestinations(d.catalog, b, enemy)[0]!, 2);
    for (const s of Object.values(b.stacks)) if (s.side === 'defender' && !s.summoned) { s.totalHp = 10; s.temporaryLife = { hp: 10, expiresAtRound: 5 }; }
    const ended = checkBattleEnd(new Tx({ catalog: d.catalog }, d.state, 'player'), b);
    expect(ended).toBe(true); expect(d.state.battle).toBeNull();
    expect(d.state.lastBattleResult!.defender.lines.every((l) => l.after === 0)).toBe(true);
    expect(d.state.lastBattleResult!.attacker.lines.some((l) => l.creatureId === ally.creatureId && l.after > 0)).toBe(true);
  });
});
