import {readFile,writeFile} from 'node:fs/promises';
const url=new URL('./preview.html',import.meta.url);
let html=await readFile(url,'utf8');
html=html.replace(/<script>\s*const original=[\s\S]*?<\/script>/,'<script src="preview.js"></script>');
if(!html.includes('id="base"'))html=html.replace('<button id="all">','<button id="base">All base versions</button><button id="maximum">All upgraded</button><a href="versions.html" style="color:#ead9a9">All 33 assets</a><button id="all">');
if(!html.includes('.building-controls'))html=html.replace('</style>','.building-controls{border-bottom:1px solid #46505b;padding:5px 0 10px}.building-controls select{width:100%;background:#131b22;color:#f1e8d2;padding:5px;border:1px solid #665a42;border-radius:3px}\n</style>');
await writeFile(url,html);
