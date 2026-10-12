from pathlib import Path
import json,hashlib,shutil,re,html
from PIL import Image
ROOT=Path('C:/Users/lazeb/Desktop/pantheon_realms'); DOC=ROOT/'docs/frontend-v1.1.0'; SRC=ROOT/'assets-source/frontend-v1.1.0'; RUN=ROOT/'assets-runtime/frontend-v1.1.0'
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x): p.write_text(json.dumps(x,indent=2,ensure_ascii=False),encoding='utf8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
jobs=read(SRC/'generation-queue.json'); recipes=read(DOC/'screen-recipes.json'); cat=read(ROOT/'docs/gui-review-2026-10-10/catalog.json')
assets={}; checks=[]
uses={
'backdrop.title-hall':['title-hall','new-game'], 'backdrop.atlas':['campaign','skirmish','random-map','empire-setup','map-editor','map-library'],
'backdrop.library':['encyclopedia','creature-detail','settings','save-archive','hall-of-records','shared-dialog'],
'mode.campaign':['new-game'], 'mode.skirmish':['new-game'], 'mode.random-map':['new-game'], 'mode.map-editor':['new-game'],
'empty.archive':['save-archive','map-library','hall-of-records']}
for j in jobs:
    if j['kind']=='concept':
        revised=Path(j['destination']).with_name(Path(j['destination']).stem+'-v2.png')
        if revised.is_file():
            j['destination']=str(revised);j['file']=revised.name
            for recipe in recipes:
                if j['key']=='concept-'+recipe['slug']:recipe['concept']='concepts/'+revised.name
    p=Path(j['destination']); assert p.is_file(),p
    with Image.open(p) as im:
        im.load(); w,h=im.size; a=im.getchannel('A') if 'A' in im.getbands() else None
        ar=a.getextrema() if a else [255,255]
    checks.append(dict(key=j['key'],file=str(p),width=w,height=h,bytes=p.stat().st_size,sha256=sha(p),alphaRange=ar))
    if j['kind']=='asset':
        dest=RUN/j['file']; shutil.copy2(p,dest); assert sha(p)==sha(dest)
        key=j['key']; short=key.removeprefix('frontend.')
        assets[key]=dict(file='frontend-v1.1.0/'+j['file'],width=w,height=h,bytes=p.stat().st_size,sha256=sha(p),hasTransparency=ar[0]<255,alphaRange=ar,sourceAbsolute=str(p),runtimeAbsolute=str(dest),screens=uses.get(short,['random-map']),role='Decorative artwork; live controls and text remain HTML',fit='contain' if j['transparent'] else 'cover',alt='' if not short.startswith('random.') else 'Illustrative '+short.split('.')[-1].replace('_',' ')+' terrain',provenance='Native built-in image generator PNG; no resampling or code retouching')
        if short.startswith('backdrop.'): assets[key]['quietRegionNormalized']=[.1,.55,.9,.93] if short=='backdrop.title-hall' else [.2,.15,.8,.85]
save(RUN/'manifest.json',dict(schema='pantheon-realms-frontend-art-v1',targetVersion='1.1.0',status='art handoff; not integrated',assets=assets))
prior=read(ROOT/'assets-runtime/ui-v1.1.0/manifest.json')['assets']
for r in recipes:
    r['newAssets']=[k for k,v in assets.items() if r['slug'] in v['screens']]
    r['sharedAssets']=['gui.surface.parchment','gui.surface.stone','gui.control.button']
    if r['slug'] in ['campaign','skirmish','random-map','encyclopedia','creature-detail']: r['sharedAssets'].append('gui.book.open')
    if r['slug']=='empire-setup':r['sharedAssets'] += ['gui.banner.'+f for f in ['greek','norse','egyptian','japanese','celtic','mesoamerican']]
    for k in r['sharedAssets']:assert k in prior,k
    r['sourceAbsolute']=str(ROOT/r['source']); assert Path(r['sourceAbsolute']).is_file()
    r['source']=str(Path(r['source'])).replace('\\','/')
    (DOC/'current').mkdir(exist_ok=True)
    for c in cat:
        if c['id'] in r['catalog']: shutil.copy2(ROOT/'docs/gui-review-2026-10-10'/c['image'],DOC/'current'/Path(c['image']).name)
    r['before']=[dict(id=c['id'],image='current/'+Path(c['image']).name,name=c['name']) for c in cat if c['id'] in r['catalog']]
    assert len(r['before'])==len(r['catalog']),(r['slug'],r['catalog'])
save(DOC/'screen-recipes.json',recipes)
coverage=[]
for c in cat:
    hit=next((r for r in recipes if c['id'] in r['catalog']),None)
    if hit:coverage.append({**c,'recipe':hit['slug'],'concept':hit['concept']})
    elif c['id']=='D01':coverage.append({**c,'recipe':'reuse existing story briefing','reference':'../gui-concepts-2026-10-10/concepts.json'})
save(DOC/'window-coverage.json',coverage)
inv=read(ROOT/'docs/gui-v1.1.0/existing-art-inventory.json')['assets']
reuse=[x for x in inv if x['id'].startswith(('brand.','emblem.','campaign.','mission.','creature.','god.','hero.','spell.','skill.','artifact.','ability.','building.','menu.'))]
for x in reuse: assert Path(x['sourceAbsolute']).is_file(); assert sha(Path(x['sourceAbsolute']))==x['sha256']
save(DOC/'reuse-inventory.json',dict(note='Copy missing bytes only; preserve target manifests and resolver rules. Not all reused assets are required at title: lazy-load by screen. Additional animation sheets remain existing game dependencies, not delivered twice.',assets=reuse))
save(DOC/'asset-validation.json',dict(status='passed',concepts=sum(j['kind']=='concept' for j in jobs),newProductionAssets=len(assets),coveredWindows=len(coverage),verifiedExistingReuseAssets=len(reuse),nativeNoResampling=True,files=checks,limitations=['Concept art text and sample content are illustrative; source code/catalog authoritative.','Gallery checks are not game integration tests.','No new code or version bump applied.']))
settings=(ROOT/'packages/ui/src/screens/Settings.tsx').read_text(encoding='utf8')
save(DOC/'settings-control-inventory.json',dict(source=str(ROOT/'packages/ui/src/screens/Settings.tsx'),sections=['gameplay','interface','display','audio','accessibility','controls','storage'],fieldLabels=re.findall(r'<Field label="([^"]+)"',settings),note='Dynamic audio labels and keybind actions must also be retained; inspect source rather than treating this extraction as exhaustive.'))
(DOC/'atlas-data.js').write_text('window.ATLAS_TYPES = '+json.dumps(read(DOC/'random-map-types.json'))+';',encoding='utf8')
esc=html.escape
parts=['''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pantheon Realms — Before the Adventure</title><link rel="stylesheet" href="gallery.css"><header><p class="eyebrow">PANTHEON REALMS · GUI 1.1.0</p><h1>Before the adventure</h1><p>Fourteen concept screens and seventeen production illustrations for the title menu, setup, codex and archives.</p><nav><a href="#concepts">Concepts</a><a href="#art">New artwork</a><a href="interactive-preview.html">Try the atlas controls</a><a href="CLAUDE_CODE_HANDOFF_1.1.0_FRONTEND.txt">Claude handoff</a></nav><p class="note">Design references, not implemented game screens. The separate text-free PNGs are the production assets. Use current game data for all names, numbers and rules.</p></header><main id="concepts">''']
review=read(DOC/'concept-review.json') if (DOC/'concept-review.json').exists() else {}
for r in recipes:
    parts += [f'<section id="{r["slug"]}"><div class="section-head"><span>{r["id"]}</span><h2>{esc(r["title"])}</h2></div><a href="{r["concept"]}"><img class="concept" loading="lazy" src="{r["concept"]}" alt="Concept: {esc(r["title"])}"></a><p>{esc(r["behavior"])}</p>']
    if review.get(r['slug']):parts += [f'<p class="note"><strong>Implementation note:</strong> {esc(review[r["slug"]])}</p>']
    parts += ['<details><summary>Current screens and asset mapping</summary><div class="before-grid">']
    for c in r['before']:parts += [f'<figure><a href="{c["image"]}"><img loading="lazy" src="{c["image"]}" alt="Current {esc(c["name"])}"></a><figcaption>{c["id"]} · {esc(c["name"])}</figcaption></figure>']
    parts += ['</div><p>New art: '+', '.join(f'<code>{x}</code>' for x in r['newAssets'])+'</p><p>Shared art: '+', '.join(f'<code>{x}</code>' for x in r['sharedAssets'])+'</p></details></section>']
parts += ['<section id="art"><h2>Text-free production artwork</h2><div class="asset-grid">']
for key,v in assets.items():
    src='../../assets-runtime/'+v['file']
    parts += [f'<figure><a href="{src}"><img loading="lazy" src="{src}" alt="{esc(key)}"></a><figcaption><code>{key}</code><br>{v["width"]} × {v["height"]} · {"transparent" if v["hasTransparency"] else "opaque"}</figcaption></figure>']
parts += ['</div></section><section><h2>Delivery files</h2><ul>']
for filename in ['CLAUDE_CODE_HANDOFF_1.1.0_FRONTEND.txt','screen-recipes.json','window-coverage.json','random-map-types.json','reuse-inventory.json','concept-review.json','asset-validation.json','Copy-To-Project.ps1']:
    parts += [f'<li><a href="{filename}">{filename}</a></li>']
parts+=['</ul><p>Generated with the built-in image generator. Native PNGs preserved; prompts are in assets-source/frontend-v1.1.0/generation-queue.json. Existing game files and package versions were not changed.</p></section></main><footer>Pantheon Realms · Art and implementation handoff · 10 October 2026</footer></html>']
(DOC/'index.html').write_text('\n'.join(parts),encoding='utf8')
print(json.dumps(dict(production=len(assets),concepts=len(recipes),coverage=len(coverage),reuse=len(reuse))))
