/**
 * The boarding battlefield's cells through hexmath (expedition kit `boarding-layout.json`): the kit's
 * normalised projection x = x0 + col·dx + (odd row ? oddRowOffset : 0), y = y0 + row·dy is an affine case
 * of `cellPoint` (`layoutBoardProjection`), so drawing and hit-testing share one transform — every one of
 * the 102 legal cells round-trips (its centre and points inside its drawn hex pick it back), each drawn
 * hex lies inside its own hit region (sprite or hex size never changes which cell a click selects), water
 * cells select nothing, and the plain board keeps the standard grid.
 */
import { describe, expect, it } from 'vitest';
import { BOARDING_TWO_SHIPS_V1, battleCellLegal, boardFromLayout, legalBattleCells, type BattleCell } from '@pr/rules';
import { BATTLE_SQUASH, cellPoint, cellPointOn, hexCorners, layoutBoardProjection, pickCellOn, plainBoardProjection, pointCellOn } from '../src/hexmath';

const L = BOARDING_TWO_SHIPS_V1;
const board = { cols: L.cols, rows: L.rows, board: boardFromLayout(L) };
const RB = 40;

describe('boarding board projection (hexmath)', () => {
  const lay = layoutBoardProjection(L.projection, L.art, RB);
  const legal = (c: BattleCell) => battleCellLegal(board, c);

  it('places every legal cell exactly where the kit measured it on the painting', () => {
    const cells = legalBattleCells(board);
    expect(cells).toHaveLength(102);
    const P = L.projection;
    for (const c of cells) {
      const p = cellPointOn(c, lay.projection);
      const nx = (p.x - lay.art.x) / lay.art.width;
      const ny = (p.y - lay.art.y) / lay.art.height;
      expect(nx, `${c.col},${c.row}`).toBeCloseTo(P.x0 + c.col * P.dx + (c.row % 2 ? P.oddRowOffset : 0), 12);
      expect(ny, `${c.col},${c.row}`).toBeCloseTo(P.y0 + c.row * P.dy, 12);
    }
    // The painting keeps its native proportions (contain: never stretched).
    expect(lay.art.width / lay.art.height).toBeCloseTo(L.art.width / L.art.height, 12);
    // A column step is one standard hex width: creature sprites keep their usual size.
    expect(cellPointOn({ col: 1, row: 0 }, lay.projection).x - cellPointOn({ col: 0, row: 0 }, lay.projection).x).toBeCloseTo(Math.sqrt(3) * RB, 9);
    // The drawn hex is the kit's 0.043 × 0.045 of the art.
    const corners = hexCorners(lay.cell.radius, lay.cell.squash);
    const w = Math.max(...corners.map((q) => q.x)) - Math.min(...corners.map((q) => q.x));
    const h = Math.max(...corners.map((q) => q.y)) - Math.min(...corners.map((q) => q.y));
    expect(w / lay.art.width).toBeCloseTo(L.projection.hexWidth, 9);
    expect(h / lay.art.height).toBeCloseTo(L.projection.hexHeight, 9);
  });

  it('round-trips all 102 legal cells: centre, drawn corners and points inside the hex pick the same cell', () => {
    const inner = hexCorners(lay.cell.radius * 0.98, lay.cell.squash);
    for (const c of legalBattleCells(board)) {
      const p = cellPointOn(c, lay.projection);
      expect(pointCellOn(p.x, p.y, lay.projection), `${c.col},${c.row}`).toEqual(c);
      expect(pickCellOn(p.x, p.y, lay.projection, L.cols, L.rows, legal)).toEqual(c);
      for (const q of inner) expect(pickCellOn(p.x + q.x, p.y + q.y, lay.projection, L.cols, L.rows, legal), `${c.col},${c.row} corner`).toEqual(c);
      for (const [dx, dy] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3], [0.2, 0.2], [-0.2, -0.2]] as const) {
        expect(pickCellOn(p.x + dx * lay.cell.radius, p.y + dy * lay.cell.radius * lay.cell.squash, lay.projection, L.cols, L.rows, legal)).toEqual(c);
      }
    }
  });

  it('water cells select nothing (no hover, move or attack target), and points off the board neither', () => {
    let water = 0;
    for (let row = 0; row < L.rows; row++)
      for (let col = 0; col < L.cols; col++) {
        const c = { col, row };
        if (legal(c)) continue;
        water++;
        const p = cellPointOn(c, lay.projection);
        expect(pointCellOn(p.x, p.y, lay.projection)).toEqual(c);
        expect(pickCellOn(p.x, p.y, lay.projection, L.cols, L.rows, legal), `${col},${row}`).toBeNull();
      }
    expect(water).toBe(L.cols * L.rows - 102);
    // Between the decks below the bridge: open water.
    const sea = cellPointOn({ col: 7, row: 8 }, lay.projection);
    expect(pickCellOn(sea.x, sea.y, lay.projection, L.cols, L.rows, legal)).toBeNull();
    // Beyond the board.
    expect(pickCellOn(-500, -500, lay.projection, L.cols, L.rows, legal)).toBeNull();
    expect(pickCellOn(lay.art.width + 200, lay.art.height * 0.5, lay.projection, L.cols, L.rows, legal)).toBeNull();
  });

  it('keeps the plain board (land battles, sieges) on the standard grid', () => {
    const plain = plainBoardProjection(RB, BATTLE_SQUASH);
    for (const c of [{ col: 0, row: 0 }, { col: 7, row: 5 }, { col: 14, row: 10 }]) {
      expect(cellPointOn(c, plain)).toEqual(cellPoint(c, RB, BATTLE_SQUASH));
      const p = cellPoint(c, RB, BATTLE_SQUASH);
      expect(pickCellOn(p.x, p.y, plain, 15, 11)).toEqual(c);
    }
  });
});
