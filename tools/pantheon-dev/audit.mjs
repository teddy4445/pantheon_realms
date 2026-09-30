#!/usr/bin/env node
import {auditCatalog,inspectAsset,auditManifest,projectHealth} from './lib/audit.mjs';
const [command,relative,...clips]=process.argv.slice(2);
try {
 const root=process.cwd();
 const result=command==='catalog'?await auditCatalog(root,relative):command==='asset'?await inspectAsset(root,relative,clips):command==='manifest'?await auditManifest(root,relative):command==='health'?await projectHealth(root):null;
 if(!result) throw new Error('Usage: node tools/pantheon-dev/audit.mjs health | catalog <path.json> | asset <path.glb> [clip names] | manifest <path.json>');
 console.log(JSON.stringify(result,null,2));
 if(result.valid===false || result.metadataChecksPass===false) process.exitCode=1;
} catch(error) {console.error(error.message);process.exitCode=1;}
