import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeAssets } from './optimize-assets.mjs';

test('release derivatives preserve atlas dimensions/alpha and shrink UI portraits only',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'pr-asset-test-'));
  const renderer=path.join(temp,'renderer');await mkdir(path.join(renderer,'hero-portraits-complete'),{recursive:true});
  let seed=42;
  const pixels=Buffer.alloc(1024*1536*4);
  for(let i=0;i<pixels.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)|0;pixels[i]=seed&255;pixels[i+1]=(seed>>>8)&255;pixels[i+2]=(seed>>>16)&255;pixels[i+3]=i%32?255:0;}
  const image=sharp(pixels,{raw:{width:1024,height:1536,channels:4}});
  await image.clone().png().toFile(path.join(renderer,'hero-portraits-complete/test.bust.png'));
  await image.clone().png().toFile(path.join(renderer,'animation.png'));
  const report=await optimizeAssets(renderer,path.join(temp,'cache'));
  assert.equal(report.converted,2);assert.equal(report.resized,1);
  const manifest=JSON.parse(await readFile(path.join(renderer,'optimized-assets.json'),'utf8'));
  const portrait=await sharp(path.join(renderer,manifest.assets['hero-portraits-complete/test.bust.png'])).metadata();
  const animation=await sharp(path.join(renderer,manifest.assets['animation.png'])).metadata();
  assert.equal(portrait.height,960);assert.equal(portrait.width,640);
  assert.equal(animation.width,1024);assert.equal(animation.height,1536);assert.equal(animation.hasAlpha,true);
  const decoded=await sharp(path.join(renderer,manifest.assets['animation.png'])).ensureAlpha().raw().toBuffer();
  for(let i=3;i<pixels.length;i+=4)assert.equal(decoded[i],pixels[i],'alpha must remain exact');
  await assert.rejects(stat(path.join(renderer,'animation.png')),{code:'ENOENT'});
  assert.ok(report.optimizedBytes<report.originalBytes);
});
