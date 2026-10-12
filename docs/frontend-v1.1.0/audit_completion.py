from pathlib import Path
import json,hashlib,shutil,html
from PIL import Image
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/frontend-v1.1.0';S=R/'assets-source/frontend-kit-v1.1.0';A=R/'assets-runtime';K=A/'frontend-kit-v1.1.0'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
existing={}
for name in ['ui/manifest.json','art/manifest.json','ui/final-manifest.json','ui-v1.1.0/manifest.json','frontend-v1.1.0/manifest.json']:
 for key,v in read(A/name)['assets'].items():existing[key]={**v,'originManifest':name}
new={}
for j in read(S/'generation-queue.json'):
 p=Path(j['destination'])
 if not p.exists():continue
 revised=p.with_name(p.stem+'-v2.png')
 if revised.exists():p=revised
 dest=K/p.name;shutil.copy2(p,dest)
 with Image.open(p) as im:
  im.load();w,h=im.size;alpha=im.getchannel('A') if 'A'in im.getbands() else None
  ar=alpha.getextrema() if alpha else (255,255); bounds=alpha.point(lambda x:255 if x>=32 else 0).getbbox() if alpha else (0,0,w,h)
  if j['transparent']:assert ar[0]==0,(j['key'],'missing transparency')
 new[j['key']]=dict(file='frontend-kit-v1.1.0/'+p.name,width=w,height=h,hasTransparency=ar[0]<255,alphaRange=ar,visibleBoundsPixels=bounds,sourceAbsolute=str(p),bytes=p.stat().st_size,sha256=digest(p),status='final',provenance='Native built-in image generator output. No pixel retouching or resampling.')
save(K/'manifest.json',dict(schema='pantheon-realms-frontend-kit-v1',assets=new))
allart={**existing,**new}
bindings={
'main-menu':{'background':'frontendkit.backdrop.title','logo':'frontendkit.brand.logo','Continue':'icon.menu.continue','New Game':'icon.menu.new-game','Load Game':'icon.menu.load-game','Encyclopedia':'icon.menu.encyclopedia','Settings':'icon.menu.settings','Quit':'icon.menu.quit','Records':'frontendkit.icon.records'},
'settings':{'Gameplay':'icon.menu.settings','Interface':'frontendkit.icon.interface','Display':'frontendkit.icon.display','Audio':'frontendkit.icon.audio','Accessibility':'frontendkit.icon.accessibility','Controls':'frontendkit.icon.controls','Saves':'icon.ui.save'},
'encyclopedia':{'Bestiary':'frontendkit.icon.bestiary','Gods':'icon.ui.pantheon','Heroes':'icon.ui.recruit','Towns':'icon.world.town','Spells':'icon.menu.encyclopedia','Skills':'icon.ui.sword2','Artifacts':'frontendkit.icon.artifacts','Abilities':'icon.action.ability','Neutral':'icon.ui.star'},
'editor-toolbar':{'New':'frontendkit.icon.new-map','Generate':'frontendkit.icon.generate','Open':'icon.menu.load-game','Save':'icon.ui.save','Export':'frontendkit.icon.export','Import':'frontendkit.icon.import','Delete':'frontendkit.icon.delete','Undo':'frontendkit.icon.undo','Redo':'frontendkit.icon.redo','Play':'icon.ui.play','Back':'icon.ui.back'},
'editor-tools':{'Select':'frontendkit.icon.select','Erase':'frontendkit.icon.erase','Terrain':'frontendkit.icon.terrain','Forest':'frontendkit.icon.forest','Water':'frontendkit.icon.water','Roads':'frontendkit.icon.road','Hex grid':'frontendkit.icon.hex','Sites':'icon.world.town','Empires':'icon.ui.flag','Check':'icon.ui.check','Map':'icon.ui.map'},
'common':{'warning':'frontendkit.icon.warning','rank-medallion':'frontendkit.icon.records','header':'frontendkit.chrome.header','round-socket':'frontendkit.chrome.round-socket','button':'gui.control.button','portrait-socket':'gui.control.socket','parchment':'gui.surface.parchment','stone':'gui.surface.stone','book':'gui.book.open','Back':'icon.ui.back','Close':'icon.ui.close','Confirm':'icon.ui.check','Locked':'icon.ui.lock','Info':'icon.ui.info','Play':'icon.ui.play','Pause':'icon.ui.pause','Stop':'icon.ui.stop','Swap':'icon.ui.swap','Upgrade':'icon.ui.upgrade','Search':'code.search-glyph','Checkbox':'code.checkbox','Slider':'code.range','Scrollbar':'code.scrollbar'},
'creature-stats':{'Attack':'icon.stat.attack','Defense':'icon.stat.defense','Health':'icon.stat.hp','Damage':'icon.stat.damage','Speed':'icon.stat.speed','Growth':'icon.ui.growth','Shots':'icon.stat.shots','Range':'icon.stat.range'},
'pantheons':{f:'frontendkit.banner.'+f for f in ['greek','norse','egyptian','japanese','celtic','mesoamerican']},
'setup-facts':{'Empires':'icon.ui.flag','Size':'icon.ui.map','Victory':'icon.menu.skirmish','Climate':'frontendkit.icon.display','Difficulty':'icon.ui.sword2','Story':'icon.menu.encyclopedia','Wealth':'icon.res.gold'}
}
missing=[]
for group,rows in bindings.items():
 for role,key in rows.items():
  if key.startswith('code.'):continue
  if key not in allart:missing.append(key)
save(D/'element-bindings.json',dict(note='Every label resolves to an independent image or a supplied CSS/SVG primitive. See UI-ART-COMPLETENESS.txt. Existing IDs refer to bundled, hash-verified bytes.',groups=bindings,missing=missing))
plan=read(R/'assets-source/sprites/content-plan.json');sprites=read(A/'sprites/manifest.json')
creatures=[]
for c in plan['creatures']:
 key=c['portraitAssetId'];v=existing.get(key);assert v,key
 anim=sprites['creatures'].get(c['id']);assert anim,c['id']
 creatures.append(dict(creatureId=c['id'],name=c['name'],pantheon=c['pantheonId'] or 'neutral',familyId=c['familyId'],familyName=c['familyName'],tier=c['tier'],form=c['form'],pairId=c['pairId'],portraitAssetId=key,portraitFile=v['file'],portraitAbsolute=str(A/v['file']),animations=anim['animations']))
save(D/'creature-art-map.json',dict(note='Verified original game portraits and native animation strips. Actual game identity takes precedence over illustrative mockup creature art. Use square portraits contained in slots; use actual animated sprites in UnitDetail. Never stretch portraits into landscape pictures.',creatures=creatures))
# Explicit complete dependency closure; original paths retained for drop-in reuse.
needed={k:v for k,v in existing.items() if k.startswith(('brand.','emblem.','icon.','creature.','god.','hero.','building.','town.','menu.','story.','campaign.','mission.','gui.','frontend.'))}
for prior in read(D/'reuse-inventory.json')['assets']:
 assert prior['id'] in needed,prior['id']
needed.update(new)
files={}
for key,v in needed.items():
 p=A/v['file'];assert p.is_file(),p
 with Image.open(p) as im:w,h=im.size
 files[v['file']]=dict(file=v['file'],sourceAbsolute=str(p),destinationRelative='assets-runtime/'+v['file'],bytes=p.stat().st_size,sha256=digest(p),kind='image')
 needed[key]={**v,'width':w,'height':h}
for c in creatures:
 for anim in c['animations'].values():
  p=A/anim['file'];assert p.is_file(),p
  files[anim['file']]=dict(file=anim['file'],sourceAbsolute=str(p),destinationRelative='assets-runtime/'+anim['file'],bytes=p.stat().st_size,sha256=digest(p),kind='animation-strip')
save(K/'complete-assets.json',dict(schema='pantheon-realms-frontend-complete-assets-v1',note='Additive asset dictionary including independently delivered art and existing dependencies. Do not overwrite authoritative target IDs blindly; compare existing records. Sprite animation metadata is in creature-art-map.json.',assets=needed))
save(D/'complete-copy-inventory.json',dict(note='This inventory is required by the complete copy helper. Nothing must be extracted from concept screenshots. Target conflicts are reported, not overwritten.',files=list(files.values())))
save(D/'kit-validation.json',dict(status='passed' if len(new)==33 and not missing else 'incomplete',newAssets=len(new),expected=33,missingBindings=missing,creatureForms=len(creatures),pantheonForms=sum(c['pantheon']!='neutral' for c in creatures),neutralForms=sum(c['pantheon']=='neutral' for c in creatures),verifiedFiles=len(files),runtimeMiB=round(sum(f['bytes'] for f in files.values())/1048576,1)))
# Standalone gallery containing every supplied pixel-based element and every portrait pair.
esc=html.escape
out=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Frontend construction kit</title><link rel="stylesheet" href="gallery.css"><style>.tiny img{height:110px;object-fit:contain;background:repeating-conic-gradient(#1e303e 0% 25%,#142532 0% 50%) 0/20px 20px}.banners img{height:230px}.portraits{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}.pair{display:flex;gap:8px}.pair figure{width:50%;padding:4px}.pair img{width:100%;height:auto;aspect-ratio:1;object-fit:contain}h3{font-size:20px}.title-proof{position:relative;aspect-ratio:1.6;background:url(../../assets-runtime/frontend-kit-v1.1.0/backdrop-title.png) center/cover;display:flex;align-items:center;flex-direction:column;justify-content:center;gap:10px;padding:4%}.title-proof>.logo{width:46%;height:auto;max-height:35%;object-fit:contain}.title-proof .menu{display:grid;gap:4px;width:26%;background:#091729cc;padding:8px}.title-proof button{display:flex;align-items:center;gap:10px;color:#f7dfac;background:linear-gradient(#143650,#091e35);border:1px solid #b08d46;padding:8px;text-align:left;font:clamp(10px,1.2vw,18px) Georgia;min-width:0}.title-proof button img{width:24px;height:24px;object-fit:contain}.title-proof button:hover{outline:2px solid #e6b658}.title-proof button:focus-visible{outline:3px solid white}.tall img{aspect-ratio:auto;max-height:200px;object-fit:contain}@media(max-width:600px){.title-proof{aspect-ratio:1;gap:3px}.title-proof>.logo{width:70%}.title-proof .menu{width:48%;padding:3px}.title-proof button{padding:4px;font-size:12px}.title-proof button img{width:18px;height:18px}}</style><header><p class="eyebrow">PANTHEON REALMS · INDEPENDENT ASSETS</p><h1>The screen construction kit</h1><p>Separate background, logo, banners, icons, surfaces and verified original creatures. No screenshot extraction required.</p><nav><a href="UI-ART-COMPLETENESS.txt">Start here: Claude handoff</a><a href="index.html">Concept gallery</a><a href="#icons">Icon bindings</a><a href="#creatures">All creature artwork</a><a href="complete-copy-inventory.json">Complete copy list</a></nav></header><main>']
out+=['<section><h2>Main-menu assembly proof</h2><p>This is assembled in HTML from the independent PNG background, transparent logo and existing menu icons. Buttons are demonstration controls only.</p><div class="title-proof"><img class="logo" src="../../assets-runtime/frontend-kit-v1.1.0/brand-logo.png" alt="Pantheon Realms"><div class="menu">']
for label in ['Continue','New Game','Load Game','Encyclopedia','Settings','Quit']:
 key=bindings['main-menu'][label];out+=[f'<button type="button" onclick="document.getElementById(\'demo-feedback\').textContent=\'Reference only: no game action runs.\'"><img src="../../assets-runtime/{allart[key]["file"]}" alt="">{label}</button>']
out+=['</div></div><p id="demo-feedback" role="status">Independent layers; actual game behavior stays in the existing components.</p></section><section><h2>New independent artwork</h2><div class="asset-grid tall">']
for key,v in new.items():
 out+=[f'<figure><a href="../../assets-runtime/{v["file"]}"><img loading="lazy" src="../../assets-runtime/{v["file"]}" alt="{key}"></a><figcaption><code>{key}</code><br>{v["width"]} × {v["height"]}</figcaption></figure>']
out+=['</div></section><section id="icons"><h2>Every role has an asset</h2>']
for group,rows in bindings.items():
 out+=[f'<h3>{group}</h3><div class="asset-grid tiny {"banners" if group=="pantheons" else ""}">']
 for label,key in rows.items():
  if key in allart:out+=[f'<figure><img loading="lazy" src="../../assets-runtime/{allart[key]["file"]}" alt=""><figcaption>{esc(label)}<br><code>{key}</code></figcaption></figure>']
  elif key.startswith('code.'):out+=[f'<figure><figcaption>{esc(label)} · native control / supplied CSS or SVG primitive<br><code>{key}</code></figcaption></figure>']
 out+=['</div>']
out+=['</section><section id="creatures"><h2>Every creature: base and upgraded</h2><p>These are the game’s existing character identities, supplied explicitly. The generic figures inside concept screenshots are not replacement game creatures.</p>']
for f in ['greek','norse','egyptian','japanese','celtic','mesoamerican','neutral']:
 out+=[f'<h3>{f.title()}</h3><div class="portraits">']
 for c in [c for c in creatures if c['pantheon']==f and c['form']=='base']:
  pair=next(x for x in creatures if x['creatureId']==c['pairId']);out+=[f'<article><h3>Tier {c["tier"]} · {esc(c["familyName"])}</h3><div class="pair">']
  for x in [c,pair]:out+=[f'<figure><a href="../../assets-runtime/{x["portraitFile"]}"><img loading="lazy" src="../../assets-runtime/{x["portraitFile"]}" alt="{esc(x["name"])}"></a><figcaption>{esc(x["name"])}<br>{x["form"]}</figcaption></figure>']
  out+=['</div></article>']
 out+=['</div>']
out+=['</section></main></html>']
gallery='\n'.join(out)
if 'frontendkit.brand.logo' in new:gallery=gallery.replace('frontend-kit-v1.1.0/brand-logo.png',new['frontendkit.brand.logo']['file'])
(D/'asset-kit.html').write_text(gallery,encoding='utf8')
print(json.dumps(read(D/'kit-validation.json')))
