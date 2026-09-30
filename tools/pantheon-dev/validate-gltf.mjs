#!/usr/bin/env node
/** Optional full Khronos validation after explicit installation of gltf-validator. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectFile} from './lib/audit.mjs';
try {
 const relative=process.argv[2];if(!relative||process.argv.length!==3)throw new Error('Usage: node tools/pantheon-dev/validate-gltf.mjs assets-runtime/path.glb');
 const root=await fs.realpath(process.cwd()),file=await projectFile(root,relative,['.glb','.gltf'],64*1024*1024);
 const dir=path.join(root,'tools/pantheon-dev/vendor/node_modules/gltf-validator');
 const p=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));
 const plan=JSON.parse(await fs.readFile(path.join(root,'tools/pantheon-dev/vendor/plan.json'),'utf8'));
 if(p.name!=='gltf-validator'||p.version!==plan.npm?.gltf?.version)throw new Error('Install the exact reviewed glTF validator plan first.');
 const entry=await fs.realpath(path.join(dir,p.main??'index.js'));
 if(!entry.startsWith((await fs.realpath(dir))+path.sep))throw new Error('Unsafe validator entrypoint.');
 const mod=await import(pathToFileURL(entry).href),validator=mod.default??mod;
 const report=await validator.validateBytes(new Uint8Array(await fs.readFile(file)),{
   uri:path.basename(file),maxIssues:1000,
   externalResourceFunction:async uri=>{
     let u;try{u=decodeURIComponent(uri);}catch{throw new Error('Invalid URI encoding.');}
     if(/[:?#\\]/.test(u)||u.startsWith('/')||u.split('/').some(x=>x==='..'||x==='.'||x.startsWith('.')))throw new Error('External URI is not a safe local asset.');
     const ref=path.posix.join(path.posix.dirname(relative),u);
     return new Uint8Array(await fs.readFile(await projectFile(root,ref,['.bin','.png','.jpg','.jpeg','.webp','.ktx2'],64*1024*1024)));
   }
 });
 console.log(JSON.stringify(report,null,2));if(report.issues?.numErrors)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
