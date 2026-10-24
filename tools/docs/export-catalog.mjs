/** Bundle and validate the real catalog in Node; export documentation data only.
 * Pass an optional YYYY-MM-DD documentation date. Temporary full catalog output
 * lives under test-results; only the compact snapshot is intended for Git. */
import { build } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'test-results/docs-catalog');
await build({root,configFile:false,logLevel:'warn',ssr:{noExternal:[/^@pr\//]},build:{ssr:path.join(root,'tools/docs/catalog-entry.ts'),outDir:out,emptyOutDir:true,minify:false,rollupOptions:{output:{entryFileNames:'catalog.mjs'}}}});
const {catalog:c}=await import(pathToFileURL(path.join(out,'catalog.mjs')).href);
const campaigns=Object.values(c.campaigns).filter(x=>x.status==='playable').map(x=>({id:x.id,name:x.name,chapters:x.chapters?.length??x.missionIds?.length??0}));
const date=process.argv[2]??new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Expected a YYYY-MM-DD documentation date.');
const snapshot={date,appVersion:JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root,'package.json'),'utf8')).version,counts:Object.fromEntries(['pantheons','families','creatures','spells','interventions','artifacts','gods','heroes'].map(k=>[k,Object.keys(c[k]??{}).length])),campaigns};
await mkdir(path.join(root,'docs/development'),{recursive:true});
await writeFile(path.join(root,'docs/development/content-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n');
await writeFile(path.join(out,'catalog.json'),JSON.stringify(c,null,2)+'\n');
console.log(JSON.stringify(snapshot,null,2));
