import { readdir, readFile, writeFile, mkdir, stat, unlink, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

/** Release derivatives only. Stable source URLs are resolved by the desktop protocol;
 * source artwork and all sprite/atlas coordinates remain unchanged. */
export async function optimizeAssets(renderer, cache) {
  sharp.concurrency(1);
  await mkdir(cache, { recursive: true });
  const files = [];
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir,e.name);
      if(e.isDirectory()) await walk(p);
      else if(/\.png$/i.test(e.name)) files.push(p);
    }
  }
  await walk(renderer);
  const assets = {}, report = { originalBytes:0, optimizedBytes:0, originalPixels:0, optimizedPixels:0, converted:0, resized:0, kept:0 };
  let cursor=0, completed=0;
  async function worker() {
    while(cursor<files.length) {
      const file=files[cursor++], size=(await stat(file)).size;
      if(size<32*1024){report.kept++;continue;}
      const relative=path.relative(renderer,file).split(path.sep).join('/');
      const input=await readFile(file), meta=await sharp(input).metadata();
      // WebP's dimensional limit; never cut, shrink or reflow animation atlases.
      if(!meta.width||!meta.height||meta.width>16383||meta.height>16383||meta.pages>1){report.kept++;continue;}
      const portrait=relative.startsWith('hero-portraits-complete/')&&relative.endsWith('.bust.png');
      const resized=portrait&&meta.height>960;
      const lossless=meta.width<=512&&meta.height<=512 || /(?:mask|edge|foam|road|cursor)/i.test(relative);
      const settings={quality:88,alphaQuality:100,effort:4,lossless};
      const key=createHash('sha256').update(input).update(JSON.stringify({settings,resized,revision:1})).digest('hex');
      const cached=path.join(cache,`${key}.webp`);
      let output;
      try { output=await readFile(cached); }
      catch(error) {
        if(error.code!=='ENOENT')throw error;
        let pipeline=sharp(input);
        if(resized)pipeline=pipeline.resize({height:960,withoutEnlargement:true});
        output=await pipeline.webp(settings).toBuffer();
        await writeFile(cached,output);
      }
      if(output.length>=size*.95){report.kept++;continue;}
      const checked=await sharp(output).metadata();
      if(checked.format!=='webp'||checked.hasAlpha!==meta.hasAlpha||(!resized&&(checked.width!==meta.width||checked.height!==meta.height)))throw new Error(`Invalid derivative: ${relative}`);
      const target=`optimized-art/${key}.webp`,destination=path.join(renderer,target);
      await mkdir(path.dirname(destination),{recursive:true});
      await copyFile(cached,destination);
      assets[relative]=target;
      // This is the disposable copied renderer tree, never assets-runtime or source art.
      await unlink(file);
      report.originalBytes+=size;report.optimizedBytes+=output.length;
      report.originalPixels+=meta.width*meta.height;report.optimizedPixels+=checked.width*checked.height;
      report.converted++;if(resized)report.resized++;
      if(++completed%100===0)console.log(`Optimized ${completed} artwork files`);
    }
  }
  await Promise.all([worker(),worker()]);
  await writeFile(path.join(renderer,'optimized-assets.json'),JSON.stringify({version:1,assets,report},null,2)+'\n');
  console.log('Release artwork:',JSON.stringify(report));
  return report;
}
