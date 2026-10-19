/**
 * Sea creatures in the interface (sea-creature delivery 2026-10-17): the sea board's view (the
 * delivered painting, its 176-cell table, deck and water legal, no deck flags), the orientation (never
 * mirrored, the ship's side on the left, the human's side blue — also when the ship is attacked), the
 * Deck Harpoon button, tooltip and preview (the rules' own numbers), the visible round limit, the
 * renewable-shot counter of the inspection card, the encounter and encyclopedia facts (no enum text),
 * the upgrade comparison and the editor's placement checks.
 */
import { describe, expect, it } from 'vitest';
import { cellOf, navalDriver, slots } from '@pr/testing';
import { TERRAIN_CODES, legalActions, previewHarpoon, type BattleState, type CustomMapDocument, type HexCoord } from '@pr/rules';
import { customRowOffset, newCustomMap } from '@pr/session';
import { boardingBoardView } from '../src/app/naval';
import { battleOrientation } from '../src/app/battleOrientation';
import { harpoonButton, harpoonPreview, seaBoardLegend, seaRetreatText, seaRoundLimit } from '../src/app/seaBattle';
import { ammunitionView } from '../src/app/battleInspection';
import { isSeaCreature, seaCreatureFacts, seaFamilies, seaUpgradeComparison } from '../src/app/seaCreatures';
import { isSeaMonsterKind, seaMonsterCreatures, seaMonsterDefaults, seaMonsterPlacementProblem } from '../src/app/editorSeaMonsters';
import { seaCreatureArt } from '../src/assets/manifest';

const H1 = 'leader_1';
const FORMS = ['hippocampus', 'tempest_hippocampus', 'triton', 'stormcaller_triton', 'isonade', 'razorwake_isonade', 'cetus', 'crownfin_cetus', 'hafgufa', 'abyssal_hafgufa'];

/** H1 aboard map_ship_a sails into a sea monster (Tritons and a Cetus). */
function seaFight() {
  const d = navalDriver({
    ships: (doc) => [{ id: 'free', ...cellOf(doc, 10, 8) }, { id: 'a', ...cellOf(doc, 11, 10), owner: 0 }],
    sites: (doc) => [{ id: 'deep', kind: 'sea_monster', ...cellOf(doc, 12, 10), guard: { creatureId: 'triton', count: 6, more: [{ creatureId: 'cetus', count: 1 }] } }],
  });
  const s = d.state;
  const ship = s.world.ships!['map_ship_a']!;
  const hero = s.heroes[H1]!;
  ship.heroId = H1;
  ship.state = 'occupied';
  hero.position = { ...ship.coord };
  hero.army.slots = slots([['hoplite', 30], ['peltast', 20]]);
  hero.movementPoints = 1000;
  d.do({ kind: 'MoveHero', heroId: H1, destination: cellOf(s.world.map, 12, 10), confirmEncounter: true });
  return d;
}

/** Make the first ship-side stack act (fixture edit of a fresh battle). */
function shipTurn(b: BattleState): string {
  const id = Object.values(b.stacks).find((s) => s.side === b.board!.shipSide && s.creatureId === 'hoplite')!.id;
  b.phase = 'normal';
  b.activeStackId = id;
  b.normalQueue = b.normalQueue.filter((x) => x !== id);
  return id;
}

describe('the sea board in the battle screen', () => {
  it('shows the delivered painting through its cell table, deck and water legal, without deck flags', () => {
    const d = seaFight();
    const b = d.state.battle!;
    expect(b.archetype).toBe('single_ship_sea_encounter_v2');
    const v = boardingBoardView(d.state)!;
    expect(v.cellTable).toHaveLength(176);
    expect(v.legalCodes).toBe('k.');
    expect(v.flags).toBeUndefined();
    const art = seaCreatureArt('seacreatures.battlefield.single-ship')!;
    expect(v.art).toEqual({ url: art.url, width: 1672, height: 941 });
    expect(art.url.startsWith('./sea-creatures-v1/')).toBe(true);
  });

  it('never mirrors the painting: the ship’s side stands on the left, the human’s side is blue', () => {
    const d = seaFight();
    const b = d.state.battle!;
    expect(b.board!.shipSide).toBe('attacker');
    expect(battleOrientation(b)).toEqual({ mirrored: false, blueSide: 'attacker', leftSide: 'attacker', rightSide: 'defender' });
    // The ship attacked (a fixture flip): still on the left and not mirrored; the human defender is blue.
    const flipped = {
      sides: { attacker: { ...b.sides.defender, controller: 'ai' as const }, defender: { ...b.sides.attacker, controller: 'human' as const } },
      board: { ...b.board!, shipSide: 'defender' as const },
    } as unknown as BattleState;
    expect(battleOrientation(flipped)).toEqual({ mirrored: false, blueSide: 'defender', leftSide: 'defender', rightSide: 'attacker' });
    // Any other battle keeps the owner's rule (human defender: mirrored).
    expect(battleOrientation({ sides: flipped.sides }).mirrored).toBe(true);
  });

  it('offers Deck Harpoon with the rules’ targets, reason and preview; tooltip from the board’s numbers', () => {
    const d = seaFight();
    const b = d.state.battle!;
    const id = shipTurn(b);
    const la = legalActions(d.catalog, d.state)!;
    const h = harpoonButton(b, la)!;
    expect(h.name).toBe('Deck Harpoon');
    expect(h.available).toBe(true);
    expect(h.targets.length).toBeGreaterThan(0);
    expect(h.tooltip).toContain('24 hexes');
    expect(h.tooltip).toContain('35%');
    expect(h.tooltip).toContain('no retaliation');
    const target = h.targets[0]!;
    expect(harpoonPreview(d.catalog, d.state, id, target)).toEqual(previewHarpoon(d.catalog, d.state, id, target));
    // A sea creature's turn: no harpoon button at all.
    const sea = Object.values(b.stacks).find((s) => s.side !== b.board!.shipSide)!;
    b.activeStackId = sea.id;
    expect(harpoonButton(b, legalActions(d.catalog, d.state))).toBeNull();
  });

  it('shows the round limit, the legend and the ship’s retreat wording on a sea board only', () => {
    const d = seaFight();
    const b = d.state.battle!;
    expect(seaRoundLimit(d.catalog, b)!.text).toBe(`of ${d.catalog.rulesProfile.combat.roundLimit}`);
    expect(seaBoardLegend(b)).toContain('Water');
    expect(seaRetreatText(b, 'attacker')).toContain('ship');
    expect(seaRetreatText(b, 'defender')).toBeNull();
    const land = { board: undefined, round: 1, encounter: { ...b.encounter, sourceShipId: null } } as unknown as BattleState;
    expect(seaRoundLimit(d.catalog, land)).toBeNull();
    expect(seaBoardLegend(land)).toBeNull();
  });

  it('counts renewable shots per round in the inspection card', () => {
    const d = seaFight();
    const b = d.state.battle!;
    const triton = Object.values(b.stacks).find((s) => s.creatureId === 'triton')!;
    expect(ammunitionView(d.catalog, triton)).toEqual({ shooter: true, left: 2, max: 2, text: '2/2', renews: 2 });
    triton.shotsRemaining = 1;
    expect(ammunitionView(d.catalog, triton).text).toBe('1/2');
    const hoplite = Object.values(b.stacks).find((s) => s.creatureId === 'peltast')!;
    expect(ammunitionView(d.catalog, hoplite).renews).toBeNull();
  });
});

describe('sea creature facts', () => {
  const d = navalDriver();
  const catalog = d.catalog;

  it('lists five families and ten forms, flyers and swimmers in players’ words (never an enum value)', () => {
    expect(seaFamilies(catalog).map((f) => f.id)).toEqual(['hippocampus', 'triton', 'isonade', 'cetus', 'hafgufa']);
    for (const id of FORMS) {
      expect(isSeaCreature(catalog, id)).toBe(true);
      const f = seaCreatureFacts(catalog, id)!;
      const text = [f.origin, f.footprint, f.movement, f.movementText, f.attack, f.attackText, f.rangeText ?? '', f.renewable ?? ''].join(' ');
      expect(text, id).not.toMatch(/_|sea_encounters|swimmer\b|renewable_shots|\bswim\b|\bfly\b/);
    }
    expect(isSeaCreature(catalog, 'hoplite')).toBe(false);
    expect(seaCreatureFacts(catalog, 'hoplite')).toBeNull();
    const hippo = seaCreatureFacts(catalog, 'hippocampus')!;
    expect([hippo.movement, hippo.footprint, hippo.attack, hippo.range, hippo.renewable]).toEqual(['Flies', 'One hex', 'Melee', null, null]);
    const triton = seaCreatureFacts(catalog, 'triton')!;
    expect([triton.movement, triton.footprint, triton.attack, triton.range]).toEqual(['Swims', 'One hex', 'Conch Blast', 9]);
    expect(triton.renewable).toContain('2 shots');
    expect(seaCreatureFacts(catalog, 'abyssal_hafgufa')!).toMatchObject({ attack: 'Deepwater Blast', footprint: 'Two hexes', range: 10 });
  });

  it('compares base and upgrade stat by stat', () => {
    const rows = seaUpgradeComparison(catalog, catalog.families['isonade']!);
    expect(rows.find((r) => r.label === 'Range')).toEqual({ label: 'Range', base: '8', upgraded: '9', change: 'up' });
    expect(rows.every((r) => r.change !== 'down')).toBe(true);
  });
});

describe('sea monsters in the map editor', () => {
  const catalog = navalDriver().catalog;
  const cell = (doc: Pick<CustomMapDocument, 'height'>, x: number, y: number): HexCoord => ({ q: x - Math.floor(y / 2) + customRowOffset(doc.height), r: y });
  function seaDoc(): CustomMapDocument {
    const doc = newCustomMap(catalog, 'small', 'Sea');
    const t = doc.terrain.split('');
    for (let y = 0; y < 24; y++)
      for (let x = 10; x <= 19; x++) {
        const c = cell(doc, x, y);
        t[c.r * doc.width + c.q] = TERRAIN_CODES.water;
      }
    return { ...doc, terrain: t.join('') };
  }

  it('places sea monsters on open water only, with an army of sea creatures', () => {
    const doc = seaDoc();
    expect(isSeaMonsterKind('sea_monster')).toBe(true);
    expect(seaMonsterDefaults(catalog)).toEqual({ guard: { creatureId: 'hippocampus', count: 6 } });
    expect(seaMonsterCreatures(catalog).map((c) => c.id).sort()).toEqual([...FORMS].sort());
    expect(seaMonsterPlacementProblem(catalog, doc, cell(doc, 15, 10))).toBeNull();
    expect(seaMonsterPlacementProblem(catalog, doc, cell(doc, 3, 10))).toBe('Sea monsters stand on open water');
    expect(seaMonsterPlacementProblem(catalog, doc, cell(doc, 15, 10), { creatureId: 'hoplite', count: 5 })).toMatch(/^[A-Z]/);
  });
});
