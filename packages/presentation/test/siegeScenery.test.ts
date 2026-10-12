import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIEGE_HEX, SIEGE_PANTHEONS, SIEGE_ROW, siegeKeepPoint, siegePaintingRect, siegeSpan, siegeWallPoint } from '../src/siegeLayout';

const root = resolve(import.meta.dirname, '../../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'assets-runtime/siege-v2/manifest.json'), 'utf8'));
function pngSize(file: string): [number, number] {
  const data=readFileSync(resolve(root,'assets-runtime',file));
  expect(data.subarray(1,4).toString()).toBe('PNG');
  return [data.readUInt32BE(16),data.readUInt32BE(20)];
}

describe('siege scenery registration', () => {
  it('registers a distinct native whole-view background and all building damage states for every pantheon', () => {
    for(const p of SIEGE_PANTHEONS) {
      const ground=manifest.ground[`battlefield.siege.ground.${p}`];
      expect(ground,p).toBeDefined();
      expect(pngSize(ground.file)).toEqual([ground.width,ground.height]);
      for(const kind of ['wall','gate','tower','keep']) for(const state of ['intact','damaged','rubble']) {
        const def=manifest.siege[`${kind}.${state}.${p}`];
        expect(def,`${kind}.${state}.${p}`).toBeDefined();
        expect(existsSync(resolve(root,'assets-runtime',def.file))).toBe(true);
        const [w,h]=pngSize(def.file), [x,y,fw,fh]=def.frame;
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x+fw).toBeLessThanOrEqual(w); expect(y+fh).toBeLessThanOrEqual(h);
        expect([fw,fh]).toEqual([def.width,def.height]);
        expect(def.anchor[1]).toBeGreaterThan(0); expect(def.anchor[1]).toBeLessThanOrEqual(1);
      }
    }
  });
  it('keeps adjoining wall rows continuous without covering the gate opening', () => {
    for(let row=0;row<10;row++) expect(siegeSpan(row).to).toBeCloseTo(siegeSpan(row+1).from);
    expect(siegeSpan(6).from-siegeSpan(4).to).toBeCloseTo(SIEGE_ROW);
    for(let row=0;row<11;row++)expect(siegeWallPoint(10,row).x).toBe(siegeWallPoint(10,0).x);
  });
  it('registers closed ditch ends and a bridge whose frames stay within their native atlas', () => {
    for(const id of ['ground.ditch','ground.ditch.top','ground.ditch.bottom','ground.bridge']) {
      const def=manifest.siege[id], [w,h]=pngSize(def.file), [x,y,fw,fh]=def.frame;
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x+fw).toBeLessThanOrEqual(w); expect(y+fh).toBeLessThanOrEqual(h);
    }
    const top=manifest.siege['ground.ditch.top'].frame, body=manifest.siege['ground.ditch'].frame, bottom=manifest.siege['ground.ditch.bottom'].frame;
    expect(top[1]+top[3]).toBe(body[1]); expect(body[1]+body[3]).toBe(bottom[1]);
  });
  it('frames the complete board and keep inside the whole-view painting without magnifying a small central crop', () => {
    const r=siegePaintingRect(15,11),keep=siegeKeepPoint(15,11);
    expect(r.width/r.height).toBeCloseTo(1.5);
    expect(r.x).toBeLessThan(-SIEGE_HEX);
    expect(r.y).toBeLessThan(-SIEGE_ROW);
    expect(r.x+r.width).toBeGreaterThan(keep.x+71);
    expect(r.y+r.height).toBeGreaterThan(11*SIEGE_ROW);
  });
});
