/**
 * Battle impacts that land (presentation only, 2026-10-16): the tween clock's hit-stop
 * (`TweenPlayer.freeze`), when a held stack's count badge changes (`nextBadge`), the hit-stop
 * and flash of a killing blow, and the missile sounds every delivered profile carries (the
 * importer's `SOUNDS` table, written into the battle FX manifest). The live picture and the cues
 * in the running game: tests/e2e/v2fx.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TweenPlayer, linear } from '../src/tween';
import { HIT_STOP_DESTROY_MS, HIT_STOP_KILL_MS, KILL_FLASH, hitStopMs, killFlashShown, nextBadge, type BadgeShown, type BadgeView } from '../src/impactTiming';
import type { ProjectileProfile } from '../src/sprites';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fx = JSON.parse(readFileSync(path.join(root, 'assets-runtime/battle-fx-neutral-upgrades-v1/manifest.json'), 'utf8')) as { projectileProfiles: Record<string, ProjectileProfile> };
const delivery = JSON.parse(readFileSync(path.join(root, 'docs/battle-fx-neutral-upgrades-v1/projectile-profiles.json'), 'utf8')) as { profiles: Record<string, { family: string }> };
const soundIds = new Set((JSON.parse(readFileSync(path.join(root, 'assets-runtime/audio/manifest.json'), 'utf8')) as { sounds: { id: string }[] }).sounds.map((s) => s.id));

/** A tween recording its progress, on `tw`. */
function track(tw: TweenPlayer, ms: number): { ts: number[]; done: boolean } {
  const out = { ts: [] as number[], done: false };
  void tw.tween(ms, (t) => out.ts.push(t), linear).then(() => (out.done = true));
  return out;
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('hit-stop: TweenPlayer.freeze', () => {
  it('holds every tween for ms × speed of ticks, then they go on where they were', async () => {
    const tw = new TweenPlayer();
    const a = track(tw, 100);
    tw.tick(40);
    expect(a.ts.at(-1)).toBeCloseTo(0.4);
    tw.freeze(60);
    expect(tw.frozen).toBe(true);
    tw.tick(30);
    tw.tick(30);
    expect(a.ts.at(-1)).toBeCloseTo(0.4);
    // A tween started during the hold waits too.
    const b = track(tw, 50);
    expect(b.ts).toEqual([]);
    tw.tick(20);
    expect(tw.frozen).toBe(false);
    expect(a.ts.at(-1)).toBeCloseTo(0.6);
    expect(b.ts.at(-1)).toBeCloseTo(0.4);
    tw.tick(40);
    await settle();
    expect(a.done && b.done).toBe(true);
    expect(tw.busy).toBe(false);
  });

  it('spends the held time first within one tick and moves on with the rest', () => {
    const tw = new TweenPlayer();
    const a = track(tw, 100);
    tw.freeze(30);
    tw.tick(50);
    expect(a.ts.at(-1)).toBeCloseTo(0.2);
  });

  it('scales with the battle speed (2 at 0.5×) and is a no-op at instant speed', () => {
    const slow = new TweenPlayer();
    slow.speed = 2;
    const a = track(slow, 100); // 200 ms of ticks
    slow.freeze(60); // 120 ms of ticks
    slow.tick(100);
    expect(a.ts.at(-1) ?? 0).toBe(0);
    slow.tick(40);
    expect(a.ts.at(-1)).toBeCloseTo(0.1);
    const instant = new TweenPlayer();
    instant.speed = 0;
    instant.freeze(100);
    expect(instant.frozen).toBe(false);
    expect(instant.busy).toBe(false);
  });

  it('overlapping freezes take the longer, never add up', () => {
    const tw = new TweenPlayer();
    const a = track(tw, 1000);
    tw.freeze(100);
    tw.tick(40);
    tw.freeze(50); // 60 ms still held: the shorter one changes nothing
    tw.freeze(80); // now 80 ms from here
    tw.tick(79);
    expect(a.ts.at(-1) ?? 0).toBe(0);
    tw.tick(11);
    expect(a.ts.at(-1)).toBeCloseTo(0.01);
  });

  it('stays busy while frozen even without tweens, and flush clears it', async () => {
    const tw = new TweenPlayer();
    tw.freeze(50);
    expect(tw.busy).toBe(true);
    tw.tick(50);
    expect(tw.busy).toBe(false);
    const a = track(tw, 200);
    tw.freeze(100);
    tw.flush();
    await settle();
    expect(tw.frozen).toBe(false);
    expect(a.done).toBe(true);
    expect(a.ts.at(-1)).toBe(1);
    expect(tw.busy).toBe(false);
  });
});

describe('count badges change at the blow, never before', () => {
  const before: BadgeShown = { label: '12', color: '#ffd9d2', visible: true };
  const hurt: BadgeView = { label: '9', labelColor: '#ffd9d2', alive: true };
  const killed: BadgeView = { label: '0', labelColor: '#ffd9d2', alive: false };

  it('a held target keeps its count when the new view arrives and shows the new one as the blow lands', () => {
    const atView = nextBadge(before, hurt, 'view', true);
    expect(atView).toEqual(before);
    const atBlow = nextBadge(atView, hurt, 'blow', true);
    expect(atBlow).toEqual({ label: '9', color: '#ffd9d2', visible: true });
    expect(nextBadge(atBlow, hurt, 'release', false)).toEqual(atBlow);
  });

  it('a stack destroyed by the shot keeps its badge until the blow, which takes it away; it never comes back', () => {
    const atView = nextBadge(before, killed, 'view', true);
    expect(atView).toEqual(before);
    const atBlow = nextBadge(atView, killed, 'blow', true);
    expect(atBlow).toEqual({ label: '0', color: '#ffd9d2', visible: false });
    expect(nextBadge(atBlow, killed, 'death', true).visible).toBe(false);
    expect(nextBadge(nextBadge(atBlow, killed, 'death', true), killed, 'release', false).visible).toBe(false);
  });

  it('instant playback and a skip (straight to the release) end with exactly the badge an unheld stack shows', () => {
    for (const v of [hurt, killed]) {
      const unheld = nextBadge(before, v, 'view', false);
      const instant = nextBadge(nextBadge(before, v, 'view', true), v, 'release', false);
      expect(instant).toEqual(unheld);
      // A skip after the blow: the same end.
      const skipped = nextBadge(nextBadge(nextBadge(before, v, 'view', true), v, 'blow', true), v, 'release', false);
      expect(skipped).toEqual(unheld);
    }
  });

  it('a stack hit twice in one batch shows the batch’s final count at its first blow (the view is the batch’s end)', () => {
    const twice: BadgeView = { label: '5', labelColor: '#ffd9d2', alive: true };
    const first = nextBadge(nextBadge(before, twice, 'view', true), twice, 'blow', true);
    expect(first.label).toBe('5');
    expect(nextBadge(first, twice, 'blow', true)).toEqual(first);
  });
});

describe('killing blows: hit-stop and flash', () => {
  it('holds a beat on a blow that kills, longer when the stack is destroyed, nothing otherwise', () => {
    expect(hitStopMs(0, 10)).toBe(0);
    expect(hitStopMs(3, 7)).toBe(HIT_STOP_KILL_MS);
    expect(hitStopMs(4, 0)).toBe(HIT_STOP_DESTROY_MS);
    expect(HIT_STOP_KILL_MS).toBeGreaterThanOrEqual(40);
    expect(HIT_STOP_DESTROY_MS).toBeGreaterThan(HIT_STOP_KILL_MS);
    expect(HIT_STOP_DESTROY_MS).toBeLessThanOrEqual(150);
  });

  it('flashes only on kills, never on Low graphics or with reduced motion', () => {
    expect(killFlashShown(2, 'high', false)).toBe(true);
    expect(killFlashShown(2, 'medium', false)).toBe(true);
    expect(killFlashShown(2, 'low', false)).toBe(false);
    expect(killFlashShown(2, 'high', true)).toBe(false);
    expect(killFlashShown(0, 'high', false)).toBe(false);
    expect(KILL_FLASH.destroyedSize).toBeGreaterThan(KILL_FLASH.size);
  });
});

describe('missile sounds (importer SOUNDS → battle FX manifest)', () => {
  const profiles = Object.entries(fx.projectileProfiles);

  it('all 24 profiles carry a release and an impact sound the sound manifest has', () => {
    expect(profiles).toHaveLength(24);
    for (const [id, p] of profiles) {
      expect(p.sounds?.release?.id, id).toBeTruthy();
      expect(p.sounds?.impact?.id, id).toBeTruthy();
      for (const s of [p.sounds!.release!, p.sounds!.impact!]) {
        expect(soundIds.has(s.id), `${id}: ${s.id}`).toBe(true);
        // Referenced by sound ID only, never a file or a URL.
        expect(s.id).toMatch(/^(combat|magic)\.[a-z_]+$/);
        if (s.maxMs !== undefined) {
          expect(Number.isInteger(s.maxMs), `${id}: ${s.id}`).toBe(true);
          expect(s.maxMs).toBeGreaterThanOrEqual(300);
          expect(s.maxMs).toBeLessThanOrEqual(1500);
        }
        expect(Object.keys(s).every((k) => k === 'id' || k === 'maxMs')).toBe(true);
      }
    }
  });

  it('a profile sounds like its missile family (the same family, the same sounds); none of the shooters plays the bow', () => {
    const byFamily = new Map<string, string>();
    for (const [id, p] of profiles) {
      const family = delivery.profiles[id]!.family;
      if (family === 'siege') continue;
      const key = JSON.stringify(p.sounds);
      expect(byFamily.get(family) ?? key, `${id} (${family})`).toBe(key);
      byFamily.set(family, key);
      expect(p.sounds!.release!.id, id).not.toBe('combat.shot');
    }
    expect(byFamily.size).toBe(11);
    // The long magic recordings (2–3.5 s) are cut to a short missile; release and impact differ
    // (a one-voice sound would otherwise silence its own impact).
    for (const [id, p] of profiles) {
      if (p.sounds!.release!.id.startsWith('magic.') && p.sounds!.release!.id !== 'magic.fire') expect(p.sounds!.release!.maxMs, id).toBeDefined();
      if (p.sounds!.impact!.id.startsWith('magic.')) expect(p.sounds!.impact!.maxMs, id).toBeDefined();
      expect(p.sounds!.release!.id, id).not.toBe(p.sounds!.impact!.id);
    }
  });

  it('the tower arrow and the Catapult keep the sounds they had', () => {
    expect(fx.projectileProfiles['siege_turret']!.sounds).toEqual({ release: { id: 'combat.turret' }, impact: { id: 'combat.arrow_hit' } });
    expect(fx.projectileProfiles['catapult']!.sounds).toEqual({ release: { id: 'combat.catapult' }, impact: { id: 'combat.stone_hit' } });
  });
});
