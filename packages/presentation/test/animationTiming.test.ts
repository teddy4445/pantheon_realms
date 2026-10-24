import { describe, it, expect } from 'vitest';
import { frameDurations, frameStart, timelineDuration, timelineFrame, segmentProgress, stableAnimationPhase } from '../src/animationTiming';
import { releaseDelayMs } from '../src/projectiles';

describe('shared creature animation clock',()=>{
  const attack={frames:6,fps:6};
  it('lands a six-pose attack on the thrust, before recovery, using the same weighted clock',()=>{
    const times=frameDurations('attack',attack,560);
    expect(timelineDuration(times)).toBe(660);
    expect(frameStart(times,3)).toBe(320);
    expect(timelineFrame(times,319,false)).toBe(2);
    expect(timelineFrame(times,320,false)).toBe(3);
    expect(timelineFrame(times,660,false)).toBe(5);
    expect(timelineFrame(times,10000,false)).toBe(5);
    expect(frameStart(times,3)).toBeLessThan(timelineDuration(times)*.6);
  });
  it('keeps shooter release and pose timing aligned for authored holds and legacy strips',()=>{
    const authored={frames:4,fps:6,frameDurationsMs:[120,180,50,250]};
    expect(releaseDelayMs(authored,500,2)).toBe(frameStart(frameDurations('shoot',authored,500),2));
    expect(releaseDelayMs(attack,560,3)).toBe(500);
    expect(timelineDuration(frameDurations('attack',attack,1000))).toBeCloseTo(1000);
    expect(timelineDuration(frameDurations('hit',{frames:3,fps:10},420))).toBe(420);
    expect(frameDurations('shoot',{frames:2,fps:10,frameDurationsMs:[0,-1]})).toEqual([100,100]);
  });
  it('holds idle rest poses while preserving duration and wraps without an out-of-range frame',()=>{
    const times=frameDurations('idle',{frames:6,fps:3});
    expect(times).toEqual([500,250,250,500,250,250]);
    expect(timelineFrame(times,1999,true)).toBe(5);
    expect(timelineFrame(times,2000,true)).toBe(0);
    expect(stableAnimationPhase('stack-1')).toBe(stableAnimationPhase('stack-1'));
    expect(stableAnimationPhase('stack-1')).not.toBe(stableAnimationPhase('stack-2'));
  });
  it('starts and stops gently, with continuous speed through intermediate tiles',()=>{
    for(let i=0;i<3;i++) {expect(segmentProgress(0,i,3)).toBe(0);expect(segmentProgress(1,i,3)).toBe(1);}
    const epsilon=.0001;
    expect(segmentProgress(epsilon,0,3)/epsilon).toBeLessThan(.001);
    expect((1-segmentProgress(1-epsilon,2,3))/epsilon).toBeLessThan(.001);
    expect((1-segmentProgress(1-epsilon,0,3))/epsilon).toBeCloseTo(1,3);
    expect(segmentProgress(epsilon,2,3)/epsilon).toBeCloseTo(1,3);
    expect(segmentProgress(.5,0,1)).toBe(.5);
  });
});
