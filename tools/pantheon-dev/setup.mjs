#!/usr/bin/env node
/** Explicit, staged developer setup. Never installs or executes third-party packages. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export const NPM_PACKAGES = Object.freeze({playwright:'@playwright/mcp'});
export const ACTIVATION_PROFILES = Object.freeze(['playwright','context7','github']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export async function safeDestination(root,relative) {
  if(path.isAbsolute(relative)||relative.split(/[\\/]/).some(x=>x==='..'||!x)||relative.includes(':'))throw new Error('Invalid destination.');
  const base=await fs.realpath(root); let at=base;
  for(const part of relative.split('/')) {at=path.join(at,part);try{if((await fs.lstat(at)).isSymbolicLink())throw new Error('Refusing a symbolic-link destination.');}catch(e){if(e.code!=='ENOENT')throw e;}}
  return at;
}
export async function readOptional(root,relative) {
  const dest=await safeDestination(root,relative);
  try {return await fs.readFile(dest,'utf8');} catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export async function put(root,relative,text,{backup=false,exclusive=false}={}) {
  const dest=await safeDestination(root,relative);await fs.mkdir(path.dirname(dest),{recursive:true});
  const old=await readOptional(root,relative);
  if(exclusive&&old!==null)throw new Error(`${relative} already exists; refusing to replace it.`);
  if(old===text)return false;
  if(backup&&old!==null)await fs.writeFile(dest+'.pantheon-backup-'+Date.now()+'-'+randomUUID().slice(0,8),old,{flag:'wx',mode:0o600});
  const temp=dest+'.tmp-'+randomUUID();
  try {await fs.writeFile(temp,text,{flag:'wx',mode:0o600});await fs.rename(temp,dest);}finally{await fs.rm(temp,{force:true});}
  return true;
}
export function mergeMcp(existing,entries) {
  if(!object(existing)|| (existing.mcpServers!==undefined&&!object(existing.mcpServers)))throw new Error('Existing .mcp.json is not an object with mcpServers.');
  const merged={...existing,mcpServers:{...(existing.mcpServers??{})}};
  for(const [name,value] of Object.entries(entries)){
    if(Object.hasOwn(merged.mcpServers,name)&&JSON.stringify(merged.mcpServers[name])!==JSON.stringify(value))throw new Error(`MCP name collision: ${name}; resolve manually, no configuration changed.`);
    merged.mcpServers[name]=value;
  }
  return merged;
}
export async function writeMcp(root,entries) {
  const text=await readOptional(root,'.mcp.json');
  const next=mergeMcp(text===null?{}:JSON.parse(text),entries);
  await put(root,'.mcp.json',JSON.stringify(next,null,2)+'\n',{backup:true});
  return Object.keys(entries);
}
export async function initProject(root,linkClaude=false) {
  const server=await fs.realpath(path.join(root,'tools/pantheon-dev/server.mjs'));
  const entries={'pr-audit':{type:'stdio',command:process.execPath,args:[server,'--root',await fs.realpath(root)]}};
  // Check both prospective writes before changing either user-owned file.
  const existing=await readOptional(root,'.mcp.json');mergeMcp(existing===null?{}:JSON.parse(existing),entries);
  const claude=linkClaude?await readOptional(root,'CLAUDE.md'):null;
  await writeMcp(root,entries);
  if(linkClaude){
    const marker='@CLAUDE_TOOLING.md';
    if(!(claude??'').split(/\r?\n/).some(l=>l.trim()===marker))
      await put(root,'CLAUDE.md',(claude??'# Pantheon Realms\n')+'\n## Development toolkit\n'+marker+'\n',{backup:true});
  }
  return {configured:['pr-audit'],thirdPartyInstalled:false,approval:'Approve the project MCP only after review in your local client.'};
}
function versionOK(x){return typeof x==='string'&&/^[0-9][0-9A-Za-z.!+_-]*(?:\.[0-9A-Za-z.!+_-]+)*$/.test(x)&&x.length<100;}
async function jsonFetch(url,fetcher=fetch){
  const r=await fetcher(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw new Error(`Metadata request failed (${r.status}): ${url}`);
  return r.json();
}
export async function resolvePlan(selected,fetcher=fetch) {
  for(const key of selected)if(!Object.hasOwn(NPM_PACKAGES,key))throw new Error(`Unknown install profile: ${key}`);
  const plan={schemaVersion:1,resolvedAt:new Date().toISOString(),npm:{}};
  for(const key of selected){
    const name=NPM_PACKAGES[key];
    const base='https://registry.npmjs.org/'+encodeURIComponent(name);
    const index=await jsonFetch(base,fetcher),version=index['dist-tags']?.latest;
    if(!versionOK(version))throw new Error(`Invalid registry version: ${name}`);
    const data=await jsonFetch(base+'/'+encodeURIComponent(version),fetcher);
    if(data.name!==name||data.version!==version||typeof data.dist?.integrity!=='string'||!data.dist.integrity.startsWith('sha512-'))throw new Error(`Incomplete package identity/integrity: ${name}`);
    const u=new URL(data.dist.tarball);if(u.protocol!=='https:'||u.hostname!=='registry.npmjs.org')throw new Error('Unexpected registry tarball origin.');
    plan.npm[key]={name,version,integrity:data.dist.integrity,tarball:u.href,license:data.license??null,engines:data.engines??null,repository:data.repository??null};
  }
  return plan;
}
export async function savePlan(root,selected,fetcher=fetch){
  if(await readOptional(root,'tools/pantheon-dev/vendor/plan.json')!==null||await readOptional(root,'tools/pantheon-dev/vendor/package.json')!==null)throw new Error('A vendor plan already exists. Review/remove or archive it deliberately before resolving a new one.');
  const plan=await resolvePlan(selected,fetcher);
  const pkg={name:'pantheon-development-tools',version:'1.0.0',private:true,description:'Development-only MCP tools; never package into the game.',dependencies:Object.fromEntries(Object.values(plan.npm).map(p=>[p.name,p.version]))};
  await put(root,'tools/pantheon-dev/vendor/package.json',JSON.stringify(pkg,null,2)+'\n',{exclusive:true});
  await put(root,'tools/pantheon-dev/vendor/plan.json',JSON.stringify(plan,null,2)+'\n',{exclusive:true});
  return plan;
}
export async function installedBin(root,plan,key,binName){
  const p=plan.npm?.[key];if(!p||p.name!==NPM_PACKAGES[key]||!versionOK(p.version))throw new Error(`No reviewed plan for ${key}.`);
  const dir=path.join(root,'tools/pantheon-dev/vendor/node_modules',p.name);
  const doc=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));
  if(doc.name!==p.name||doc.version!==p.version)throw new Error(`${key} installed version does not match the plan.`);
  const bin=typeof doc.bin==='string'?doc.bin:doc.bin?.[binName];
  if(typeof bin!=='string'||path.isAbsolute(bin)||bin.split(/[\\/]/).includes('..'))throw new Error(`Package has no safe ${binName} entry; inspect its pinned README.`);
  const resolved=await fs.realpath(path.join(dir,bin)),realDir=await fs.realpath(dir);
  if(!resolved.startsWith(realDir+path.sep))throw new Error('Package executable escapes its directory.');
  return resolved;
}
export async function activationEntries(root,selected,{env=process.env}={}){
  for(const key of selected)if(!ACTIVATION_PROFILES.includes(key))throw new Error(`Unknown activation profile: ${key}`);
  const local=selected.includes('playwright');
  const plan=local?JSON.parse(await readOptional(root,'tools/pantheon-dev/vendor/plan.json')??'null'):null;
  if(local&&!plan)throw new Error('Resolve, review, and install the vendor plan first.');
  const entries={};
  if(selected.includes('playwright'))entries['pr-playwright']={type:'stdio',command:process.execPath,args:[await installedBin(root,plan,'playwright','playwright-mcp'),'--config',path.join(root,'tools/pantheon-dev/playwright.config.json')]};
  if(selected.includes('context7'))entries['pr-context7']={type:'http',url:'https://mcp.context7.com/mcp',...(env.CONTEXT7_API_KEY?{headers:{Authorization:'Bearer ${CONTEXT7_API_KEY}'}}:{})};
  if(selected.includes('github')){
    if(!env.PANTHEON_GITHUB_TOKEN)throw new Error('Set a read-only, repository-scoped PANTHEON_GITHUB_TOKEN in the client environment before activation. Its value will not be written.');
    entries['pr-github-readonly']={type:'http',url:'https://api.githubcopilot.com/mcp/readonly',headers:{Authorization:'Bearer ${PANTHEON_GITHUB_TOKEN}'}};
  }
  return entries;
}
function options(argv){const out={};for(const arg of argv){if(!arg.startsWith('--'))throw new Error('Expected named options.');const at=arg.indexOf('=');const k=arg.slice(2,at<0?undefined:at);if(Object.hasOwn(out,k))throw new Error('Repeated option.');out[k]=at<0?true:arg.slice(at+1);}return out;}
export async function main(argv=process.argv.slice(2)){
  const root=await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
  const [cmd,...rest]=argv,opts=options(rest);
  for(const k of Object.keys(opts))if(!['with','link-claude'].includes(k))throw new Error(`Unknown option ${k}`);
  const chosen=typeof opts.with==='string'?[...new Set(opts.with.split(',').filter(Boolean))]:[];
  if(cmd==='init')return initProject(root,opts['link-claude']===true);
  if(cmd==='plan'){if(!chosen.length)throw new Error('Choose --with=playwright.');return savePlan(root,chosen);}
  if(cmd==='activate'){if(!chosen.length)throw new Error('Choose profiles with --with=...');const entries=await activationEntries(root,chosen);return {configured:await writeMcp(root,entries),notice:'No software was executed. Restart/reload the local client and review each MCP permission prompt.'};}
  return {usage:['node tools/pantheon-dev/setup.mjs init --link-claude','node tools/pantheon-dev/setup.mjs plan --with=playwright','Review vendor/plan.json and package.json; create/review lockfile and install explicitly (see Quick Start).','node tools/pantheon-dev/setup.mjs activate --with=playwright','node tools/pantheon-dev/setup.mjs activate --with=context7','node tools/pantheon-dev/setup.mjs activate --with=github'],note:'No command silently installs third-party code or bypasses tool approvals.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().then(v=>console.log(JSON.stringify(v,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
