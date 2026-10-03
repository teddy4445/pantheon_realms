#!/usr/bin/env node
import {auditCatalog,inspectSpriteManifest,auditManifest,projectHealth} from './lib/audit.mjs';
const [command,relative,...extra]=process.argv.slice(2);
try {
 const root=process.cwd();
 const result=extra.length?null:command==='catalog'?await auditCatalog(root,relative):command==='sprites'?await inspectSpriteManifest(root,relative):command==='manifest'?await auditManifest(root,relative):command==='health'&&relative===undefined?await projectHealth(root):null;
 if(!result) throw new Error('Usage: node tools/pantheon-dev/audit.mjs health | catalog <path.json> | sprites [assets-runtime/sprites/manifest.json] | manifest <path.json>');
 console.log(JSON.stringify(result,null,2));
 if(result.valid===false) process.exitCode=1;
} catch(error) {console.error(error.message);process.exitCode=1;}
