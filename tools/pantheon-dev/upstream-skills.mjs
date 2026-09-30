#!/usr/bin/env node
/** Fetch optional upstream skills only after an explicit plan, then explicit activation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {put,readOptional,safeDestination} from './setup.mjs';
const ALLOWED=['frontend-design','webapp-testing'];
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PLAN='tools/pantheon-dev/upstream-plan.json';
const validHash=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
export function blobHash(bytes){return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');}
export function validatePlan(plan){
 if(plan?.repository!=='anthropics/skills'||!validHash(plan.commit)||!Array.isArray(plan.files)||!plan.files.length||plan.files.length>100)throw new Error('Invalid upstream plan.');
 const seen=new Set();let total=0;
 for(const f of plan.files){
   if(typeof f.path!=='string'||!ALLOWED.some(n=>f.path.startsWith('skills/'+n+'/'))||f.path.split('/').some(x=>!x||x==='..'||x==='.'||x.startsWith('.'))||/[\\\x00-\x1f]/.test(f.path)||!validHash(f.sha)||!Number.isInteger(f.size)||f.size<0||f.size>2*1024*1024||seen.has(f.path))throw new Error('Unsafe upstream file record.');
   total+=f.size;seen.add(f.path);
 }
 if(total>8*1024*1024)throw new Error('Upstream snapshot exceeds review budget.');
 for(const name of ALLOWED)if(!seen.has(`skills/${name}/SKILL.md`)||!seen.has(`skills/${name}/LICENSE.txt`))throw new Error('Missing upstream entrypoint or license.');
 return plan;
}
async function request(url){const r=await fetch(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'Pantheon-Development-Toolkit'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(`Request failed (${r.status}): ${url}`);return r;}
export async function makePlan(root=ROOT){
 if(await readOptional(root,PLAN)!==null)throw new Error('Plan exists. Preserve/review it; remove deliberately before resolving a new revision.');
 const c=await (await request('https://api.github.com/repos/anthropics/skills/commits/main')).json();
 if(!validHash(c.sha)||!validHash(c.commit?.tree?.sha))throw new Error('Invalid upstream commit.');
 const t=await (await request('https://api.github.com/repos/anthropics/skills/git/trees/'+c.commit.tree.sha+'?recursive=1')).json();
 if(t.truncated||!Array.isArray(t.tree))throw new Error('Incomplete upstream tree; no snapshot created.');
 const chosen=t.tree.filter(f=>ALLOWED.some(n=>f.path.startsWith('skills/'+n+'/'))&&f.type==='blob');
 if(chosen.some(f=>f.mode==='120000'))throw new Error('Upstream contains a symlink; manual review required.');
 const plan=validatePlan({schemaVersion:1,repository:'anthropics/skills',commit:c.sha,resolvedAt:new Date().toISOString(),files:chosen.map(f=>({path:f.path,sha:f.sha,size:f.size}))});
 await put(root,PLAN,JSON.stringify(plan,null,2)+'\n',{exclusive:true});return {commit:plan.commit,files:plan.files.length,next:'Review upstream-plan.json; run fetch, inspect all downloaded files, then explicitly enable.'};
}
export async function fetchPlan(root=ROOT){
 const p=validatePlan(JSON.parse(await readOptional(root,PLAN)??'null'));
 const target=await safeDestination(root,'tools/pantheon-dev/optional-skills');
 try{await fs.lstat(target);throw new Error('Optional skill directory exists; refusing to overwrite.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const staging=target+'.tmp-'+randomUUID();await fs.mkdir(staging,{recursive:true});
 try{
  for(const f of p.files){
   const raw='https://raw.githubusercontent.com/anthropics/skills/'+p.commit+'/'+f.path.split('/').map(encodeURIComponent).join('/');
   const bytes=Buffer.from(await (await request(raw)).arrayBuffer());
   if(bytes.length!==f.size||blobHash(bytes)!==f.sha)throw new Error('Upstream file verification failed: '+f.path);
   const dest=path.join(staging,f.path.slice('skills/'.length));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes,{flag:'wx'});
  }
  await fs.rename(staging,target);
 }catch(e){await fs.rm(staging,{recursive:true,force:true});throw e;}
 return {downloaded:ALLOWED,commit:p.commit,enabled:false,notice:'Read SKILL.md, scripts and licenses before enabling. No downloaded code has been executed.'};
}
export async function enableSkill(name,root=ROOT){
 if(!ALLOWED.includes(name))throw new Error('Only the two reviewed upstream candidates may be enabled.');
 const p=validatePlan(JSON.parse(await readOptional(root,PLAN)??'null'));
 const target=await safeDestination(root,'.claude/skills/'+name);
 try{await fs.lstat(target);throw new Error('Skill destination already exists.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const source=await safeDestination(root,'tools/pantheon-dev/optional-skills/'+name);
 const selected=p.files.filter(f=>f.path.startsWith('skills/'+name+'/'));
 const staging=target+'.tmp-'+randomUUID();await fs.mkdir(staging,{recursive:true});
 try{
   for(const f of selected){
    const relative=f.path.slice(('skills/'+name+'/').length),src=await safeDestination(root,'tools/pantheon-dev/optional-skills/'+name+'/'+relative);
    const bytes=await fs.readFile(src);if(bytes.length!==f.size||blobHash(bytes)!==f.sha)throw new Error('Downloaded snapshot changed; review and re-plan deliberately.');
    const dest=path.join(staging,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes,{flag:'wx'});
   }
   await fs.rename(staging,target);
 }catch(e){await fs.rm(staging,{force:true,recursive:true});throw e;}
 return {enabled:name,commit:p.commit,source,notice:'Root Pantheon rules retain precedence. Upstream skill execution still requires normal client permissions.'};
}
async function main(){const [cmd,name,...extra]=process.argv.slice(2);if(extra.length)throw new Error('Too many arguments.');if(cmd==='plan')return makePlan();if(cmd==='fetch')return fetchPlan();if(cmd==='enable')return enableSkill(name);return {usage:['node tools/pantheon-dev/upstream-skills.mjs plan','node tools/pantheon-dev/upstream-skills.mjs fetch','Review tools/pantheon-dev/optional-skills completely.','node tools/pantheon-dev/upstream-skills.mjs enable frontend-design'],note:'webapp-testing is optional; its Python examples do not replace the project TypeScript test suite.'};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
