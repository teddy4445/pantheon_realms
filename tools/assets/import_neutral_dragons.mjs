import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=process.cwd(),src=path.join(root,'docs/neutral-dragons-review-v1');
const sharp=createRequire(import.meta.url)(process.argv[2]||'sharp');
const plan=JSON.parse(await readFile(path.join(src,'design/roster.json'),'utf8'));
const preview=JSON.parse(await readFile(path.join(src,'design/sprite-manifest.json'),'utf8'));
const dest='assets-runtime/neutral-dragons-v1';await mkdir(dest,{recursive:true});
await cp(path.join(src,'assets'),dest,{recursive:true});
const manifest={version:1,provenance:'Approved dragon review, built-in ImageGen, October 2026',creatures:{},assets:{},sites:{},recruitment:{},abilities:{}};
const families=[],abilities=[],lore=[];
const roles={yinglong:'flying_interceptor',zilant:'fast_melee',cuelebre:'heavy_melee'};
const stories={yinglong:['Where mountain rain meets the first river, the winged dragons keep watch. They follow no temple banner: an army earns their aid by defending the springs.','Pearl scales and branching antlers mark a guardian old enough to remember rivers that no longer flow. Its wings shelter an entire battle line.'],zilant:['Above ruined hill forts, black serpents circle on crimson wings. A Zilant bargains for a place beside the bold; its warning hiss can still the answering strike of a veteran.','The crown is a sign of dominion among the high nests. Its expanded neck fan and lance-like tail announce the sovereign before its dread call is heard.'],cuelebre:['In forest caverns, feather-winged serpents coil around treasures older than the roads. A Cuélebre guards a sworn companion as fiercely as its own hoard.','The oldest guardians bear ivory quill crowns and layered neck shields. When their wings fold around their companions, the line holds.']};
for(const f of plan.forms){
 const set=structuredClone(preview.creatures[f.id]);delete set.reviewApproved;delete set.portraits;
 set.provenance=manifest.provenance;
 for(const strip of Object.values(set.animations))strip.file=strip.file.replace('assets/',dest+'/');
 manifest.creatures[f.id]=set;
 manifest.assets[`dragons.portrait.${f.id}`]={file:`${dest}/${f.id}/portrait-320.webp`,width:320,height:320};
 manifest.assets[`icon.ability.${f.ability.id}`]={file:`${dest}/${f.id}/portrait-64.webp`,width:64,height:64};
 // The recruitment stage consumes a horizontal strip; align all six ground pivots.
 const idle=set.animations.idle,tiles=[];
 for(let n=0;n<6;n++){const r=idle.regions[n], [left,top,width,height]=r.rect;const crop=await sharp(idle.file).extract({left,top,width,height}).png().toBuffer();
  tiles.push({input:crop,left:n*384,top:Math.round(300-r.anchor[1])});}
 const stageFile=`${dest}/${f.id}/recruit-idle.webp`;
 await sharp({create:{width:2304,height:512,channels:4,background:'#00000000'}}).composite(tiles).webp({quality:95,alphaQuality:100}).toFile(stageFile);
 const {data:stagePixels,info:stageInfo}=await sharp(stageFile).raw().toBuffer({resolveWithObject:true});
 const visible=[384,512,0,0];
 for(let y=0;y<512;y++)for(let x=0;x<2304;x++)if(stagePixels[(y*2304+x)*stageInfo.channels+3]>12){const px=x%384;visible[0]=Math.min(visible[0],px);visible[1]=Math.min(visible[1],y);visible[2]=Math.max(visible[2],px+1);visible[3]=Math.max(visible[3],y+1);}
 manifest.recruitment[f.id]={file:stageFile,frames:6,frameWidth:384,frameHeight:512,fps:2,anchor:[.5,300/512],visible,native:true};
 const fx=structuredClone(preview.effects[f.id]);fx.file=fx.file.replace('assets/',dest+'/');fx.status='final';fx.pixelsPerHex=100;fx.provenance=manifest.provenance;
 manifest.abilities[f.ability.id]={icon:`${dest}/${f.id}/portrait-96.webp`,particle:f.familyId==='yinglong'?'splash':f.familyId==='zilant'?'ember':'feather',school:f.familyId==='yinglong'?'water':f.familyId==='zilant'?'shadow':'silver',durationMs:1250,size:7,miracle:false,name:f.ability.name,pantheon:'neutral',tier:7,sequence:f.ability.name,strip:fx};
 const upgraded=f.form==='upgraded';
 const rule=f.familyId==='yinglong'?{type:'sheltering_wings',reductionPercent:upgraded?30:25,range:3,maxTargets:upgraded?2:1,livingOnly:true,includeSelf:true,usesPerBattle:1}:f.familyId==='zilant'?{type:'distract',range:3,maxTargets:upgraded?2:1,mindEffect:true,usesPerBattle:1}:{type:'reed_guard',defenseBonus:upgraded?5:4,allAdjacent:upgraded,livingOnly:true,usesPerBattle:1};
 abilities.push({id:f.ability.id,name:f.ability.name,activation:'active',summary:f.ability.rule,exactRule:f.ability.rule+' Range is measured between occupied hexes; a clear line is required.',restriction:f.familyId==='zilant'?'Undead, constructs and mind-immune creatures are immune. Copies do not stack.':f.familyId==='yinglong'?'May target itself. Undead and constructs are ineligible; copies do not stack.':'Protects other living allies, never undead or constructs. Copies do not stack.',rule,implementationStatus:'implemented'});
 if(!upgraded){
  const up=plan.forms.find(a=>a.familyId===f.familyId&&a.form==='upgraded');
  const form=a=>({id:a.id,name:a.name,plural:a.familyId==='yinglong'?a.name+'s':a.familyId==='zilant'?a.name+'s':a.name+'s',stats:a.stats,cost:a.cost,abilities:[...a.traits,a.ability.id],summary:stories[a.familyId][a.form==='upgraded'?1:0],portraitAlt:a.name+', a winged '+a.familyId+' dragon.',portraitAssetId:`dragons.portrait.${a.id}`});
  families.push({familyId:f.familyId,name:f.familyId==='yinglong'?'Yinglong Rain Dragons':f.familyId==='zilant'?'Zilants':'Cuélebres',pantheonId:null,tier:7,growth:1,role:roles[f.familyId],roleLabel:f.role+' (neutral)',body:'serpent',base:form(f),upgraded:form(up)});
  lore.push({id:`lore.${f.familyId}`,sourceNote:f.myth+' The upgrade, story and abilities are original game adaptations.',sourceRefs:[f.mythSource],sourceStatus:'draft_requires_review',gameLore:stories[f.familyId][0],upgradeLore:stories[f.familyId][1]});
  manifest.sites[`map.site.neutral_dwelling.${f.id}`]={file:`${dest}/${f.id}/map-160.webp`,width:160,height:160,anchor:[.5,.9],pixelsPerHex:110,status:'final',provenance:manifest.provenance};
 }
}
// Vite/Electron serve the contents of assets-runtime at the application root.
await writeFile(dest+'/manifest.json',JSON.stringify(manifest,(_key,value)=>typeof value==='string'?value.replace(/^assets-runtime\//,''):value,2)+'\n');
const habitats={neutral_rain_dragon:{habitat:'Misty waterfalls, lake springs and upland shrines.',tags:['upland_meadow','lake_bank','river_pool'],forbidden:['open_water','bare_dunes','lava'],biomes:['coast','high_pass','storm_plateau','temperate','fjord','autumn']},neutral_zilant:{habitat:'Ruined hill forts and high rocky nests.',tags:['limestone_hills','arid_scrub','conifer_edge'],forbidden:['open_water','lava'],biomes:['high_pass','storm_plateau','temperate','desert','tundra','fjord']},neutral_cuelebre:{habitat:'Ancient forest caves and freshwater treasure caverns.',tags:['mossy_grove','temperate_forest','freshwater_reeds','jungle_freshwater_bank'],forbidden:['open_water','bare_dunes','lava'],biomes:['temperate','moor','autumn','jungle','fjord']}};
await writeFile('packages/content/src/common/neutralDragons.ts',`/** Approved neutral dragon kit. Statistics remain proposed and unplaytested. Generated by tools/assets/import_neutral_dragons.mjs. */\nimport type {AbilityDefinition,LoreDefinition,NeutralHabitat} from '@pr/rules';\nimport type {FamilySpec} from '../greek/creatures';\nexport const DRAGON_FAMILY_SPECS: readonly FamilySpec[] = ${JSON.stringify(families,null,2)};\nexport const DRAGON_ABILITIES: readonly AbilityDefinition[] = ${JSON.stringify(abilities,null,2)};\nexport const DRAGON_LORE: readonly LoreDefinition[] = ${JSON.stringify(lore,null,2)};\nexport const DRAGON_HABITATS: Readonly<Record<string,NeutralHabitat>> = ${JSON.stringify(habitats,null,2)};\nexport const DRAGON_SITE_STOCK: Readonly<Record<string,number>> = ${JSON.stringify(Object.fromEntries(Object.keys(habitats).map(id=>[id,1])))};\n`);
await writeFile('packages/presentation/src/neutralDragonArt.ts', `// Generated by tools/assets/import_neutral_dragons.mjs.\nimport type { PaintedMagicRecipe } from './paintedMagicTypes';\nconst recipes: Readonly<Record<string, PaintedMagicRecipe>> = ${JSON.stringify(manifest.abilities,(_key,value)=>typeof value==='string'?value.replace(/^assets-runtime\//,''):value,2)};\nexport const dragonAbilityRecipe = (id: string): PaintedMagicRecipe | undefined => recipes[id];\n`);
console.log('Imported six dragons, 78 clips, six effects, portraits, hiring-site figures and recruitment strips.');
