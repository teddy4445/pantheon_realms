/** Check local documentation links and images without contacting external hosts.
 * Includes current guides, not historical production archives. Directory links
 * are valid GitHub navigation targets; heading fragments are left to rendering QA. */
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const documents=['README.md','CONTRIBUTING.md','ASSET_CREDITS.md','tools/docs/README.md'];
for(const base of ['packages','apps'])for(const entry of await readdir(path.join(root,base),{withFileTypes:true})){
  if(entry.isDirectory())documents.push(`${base}/${entry.name}/README.md`);
}
for(const name of await readdir(path.join(root,'docs/development')))if(name.endsWith('.md'))documents.push(`docs/development/${name}`);
let checked=0;const errors=[];
for(const file of documents){
 const content=await readFile(path.join(root,file),'utf8');
 const prose=content.replace(/```[\s\S]*?```/g,'');
 const targets=[...prose.matchAll(/\]\(([^)]+)\)/g),...prose.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
 for(const raw of targets){
  if(/^(?:https?:|mailto:|#)/i.test(raw))continue;
  const target=decodeURIComponent(raw.split('#')[0].replace(/^<|>$/g,''));if(!target)continue;
  checked++;
  try{await access(path.resolve(root,path.dirname(file),target));}catch{errors.push(`${file}: missing ${target}`);}
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Checked ${checked} local links/images in ${documents.length} current documentation files.`);
