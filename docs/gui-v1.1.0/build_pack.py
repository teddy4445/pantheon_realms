"""Package native generated PNGs. Read-only pixel inspection; no image editing."""
from pathlib import Path
from PIL import Image
import json, hashlib, shutil, html, collections

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/gui-v1.1.0'
SRC = ROOT / 'assets-source/ui-v1.1.0'
RUN = ROOT / 'assets-runtime/ui-v1.1.0'
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, data): p.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
jobs = read(SRC/'generation-queue.json')['assets']
assets = {}
for j in jobs:
    source = SRC/j['file']
    if not source.exists(): raise FileNotFoundError(source)
    with Image.open(source) as im:
        width,height = im.size
        alpha = im.getchannel('A') if 'A' in im.getbands() else None
        extrema = alpha.getextrema() if alpha else [255,255]
        bounds = alpha.point(lambda a: 255 if a > 32 else 0).getbbox() if alpha else (0,0,width,height)
        transparent = extrema[0] == 0
        if j['transparent'] and not transparent: raise ValueError('Missing alpha: '+j['id'])
        center_alpha = alpha.getpixel((width//2,height//2)) if alpha else 255
        if j['kind'] in ('frame','socket') and center_alpha > 0: raise ValueError('Filled center: '+j['id'])
        rec = dict(file='ui-v1.1.0/'+j['file'], kind=j['kind'], theme=j['theme'], width=width,height=height,
                   status='final', hasTransparency=transparent, alphaRange=extrema,
                   visibleBounds=[round(v/d,5) for v,d in zip(bounds,[width,height,width,height])],
                   boundsAlphaThreshold=32, sha256=sha(source), bytes=source.stat().st_size,
                   provenance='Native built-in image generator output, 2026-10-10. No upscaling, cropping or code retouching.')
        if j['kind']=='frame':
            rec['nineSlice']={'top':256,'right':320,'bottom':256,'left':320,'fill':False,'cssBorderWidth':64,'minimumWidth':280,'minimumHeight':180}
            rec['contentPaddingCssPx']=40
            rec['surfaceInsetCssPx']={'greek':[20,11,28,11],'norse':[26,17,28,17],'egyptian':[23,14,26,14],'japanese':[19,14,26,14],'celtic':[19,16,27,16],'mesoamerican':[15,11,23,11]}[j['theme']]
        if j['kind']=='banner': rec['safeContentRect']=[.27,.24,.73,.76]
        if j['kind']=='book': rec['safePageRects']=[[.10,.15,.44,.84],[.56,.15,.90,.84]]
        if j['kind']=='recruitment-stage': rec['unitGroundAnchor']=[.5,.86]
        if j['kind']=='merchant-vignette': rec['usage']='Illustration header only. Trade controls below; merchant is decorative, not a named gameplay NPC.'
        assets[j['id']]=rec
    target=RUN/j['file']
    if not target.exists() or sha(target)!=rec['sha256']: shutil.copy2(source,target)
manifest={'schema':'pantheon-realms-gui-art-v1','version':'1.1.0','status':'art handoff; not yet integrated into game','assets':assets}
write(RUN/'manifest.json',manifest)
write(SRC/'asset-metadata.json',manifest)

# Resolve existing artwork in the same priority order used by the current UI.
merged={}
for rel in ['ui/manifest.json','art/manifest.json','ui/final-manifest.json']:
    for key,val in read(ROOT/'assets-runtime'/rel).get('assets',{}).items():
        merged[key]={**val,'originManifest':rel}
reuse=[]
missing=[]
for key,val in merged.items():
    if not val.get('file'): continue
    if val.get('kind') in ('terrain','sky','battlefield'): continue
    p=ROOT/'assets-runtime'/val['file']
    if not p.exists(): missing.append({'id':key,'file':val['file']}); continue
    record={'id':key,'file':val['file'],'sourceAbsolute':p.as_posix(),'originManifest':val['originManifest'],'bytes':p.stat().st_size,'sha256':sha(p)}
    try:
        with Image.open(p) as im: record.update(width=im.width,height=im.height)
    except Exception: pass
    reuse.append(record)
for p in (ROOT/'assets-runtime/ui/cursors').glob('*.png'):
    reuse.append({'id':'existing-cursor:'+p.stem,'file':p.relative_to(ROOT/'assets-runtime').as_posix(),'sourceAbsolute':p.as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'originManifest':'preserve current cursor resolver'})
for key, creature in read(ROOT/'assets-runtime/sprites/manifest.json').get('creatures',{}).items():
    idle=creature.get('animations',{}).get('idle')
    if not idle or not idle.get('file'): continue
    p=ROOT/'assets-runtime'/idle['file']
    if not p.exists(): missing.append({'id':'sprite-idle:'+key,'file':idle['file']}); continue
    reuse.append({'id':'sprite-idle:'+key,'file':idle['file'],'sourceAbsolute':p.as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'originManifest':'sprites/manifest.json','animationMetadata':idle,'usage':'Existing idle strip for recruitment preview. Keep original manifest frame and anchor metadata; never render the entire strip as one creature.'})
for sound in read(ROOT/'assets-runtime/audio/manifest.json').get('sounds',[]):
    if sound.get('bus')!='interface': continue
    for file in sound.get('files',[]):
        p=ROOT/'assets-runtime'/file
        if not p.exists(): missing.append({'id':sound['id'],'file':file}); continue
        reuse.append({'id':'existing-sound:'+sound['id'],'file':file,'sourceAbsolute':p.as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'originManifest':'audio/manifest.json','usage':'Reuse current audio engine and original sound ID, gain and bus. Inventory prefix is descriptive only.'})
write(DOC/'existing-art-inventory.json',{'note':'Verified existing art: preserve resolvers and copy missing bytes only. This inventory is not a replacement game manifest. Do not infer faction associations or rules from filenames. New pack is self-contained; existing game art is a reuse dependency.','assets':reuse,'unavailable':missing})

concepts=read(ROOT/'docs/gui-concepts-2026-10-10/concepts.json')
catalog=read(ROOT/'docs/gui-review-2026-10-10/catalog.json')
roles={
 '01':['gui.encounter.treasure','gui.encounter.treasure-empty','gui.control.socket'],
 '02':['gui.encounter.longship','gui.encounter.crossroads','gui.control.socket'],
 '03':['gui.encounter.hermit','gui.encounter.crossroads','gui.control.socket'],
 '04':['gui.surface.stone','gui.control.socket'],
 '05':['gui.surface.leather','gui.equipment.figure','gui.control.socket'],
 '06':['gui.recruit.{faction}','gui.control.socket'],
 '07':['gui.surface.parchment','gui.control.socket'],
 '08':['gui.surface.stone','gui.control.socket'],
 '09':['gui.banner.{faction}','gui.control.socket'],
 '10':['gui.merchant.{faction}','gui.control.socket'],
 '11':['gui.book.open','gui.surface.parchment'],
 '12':['gui.book.open','gui.control.socket'],
 '13':['gui.surface.parchment'],
 '14':['gui.frame.{faction}','gui.control.button','gui.control.socket','gui.surface.stone','gui.surface.parchment','gui.surface.leather']}
for c in concepts:
    c['productionAssets']=roles[c['id']]
    c['conceptAbsolute']=(ROOT/'docs/gui-concepts-2026-10-10'/c['file']).as_posix()
write(DOC/'screen-recipes.json',concepts)
coverage=[]
for entry in catalog:
    matching=[c for c in concepts if entry['id'] in c['catalog']]
    specialized=[]
    source=entry['source']
    if any(x in source for x in ['Journal','Encyclopedia','spellbook','miraclebook']): specialized+=['gui.book.open']
    if 'Recruitment' in source: specialized+=['gui.recruit.{faction}']
    if 'Hero.tsx' in source: specialized+=['gui.equipment.figure','gui.surface.leather']
    if entry['id'] in ['T02','T04','T05']: specialized+=['gui.merchant.{faction}']
    for c in matching: specialized+=roles[c['id']]
    coverage.append({**entry,'sharedAssets':['gui.frame.{faction}','gui.surface.parchment','gui.surface.stone','gui.control.button','gui.control.socket'],
                     'additionalAssets':sorted(set(specialized)), 'concepts':[c['id'] for c in matching],
                     'implementation':'Preserve all existing actions and state handling. Apply shared skin; use the matching screen recipe where listed. Keep compact toasts/tooltips minimally framed rather than placing a large ornate frame around every row.'})
write(DOC/'window-coverage.json',coverage)
factions=['greek','norse','egyptian','japanese','celtic','mesoamerican']
write(DOC/'theme-map.json',{f:{'frame':'gui.frame.'+f,'banner':'gui.banner.'+f,'recruitment':'gui.recruit.'+f,'merchant':'gui.merchant.'+f,'emblem':'emblem.'+f} for f in factions})
write(DOC/'encounter-art-map.json',{'specific':[{'campaignId':'winter_oath','mapId':'winter_oath_m01_v1','siteId':'m01_longship','assetId':'gui.encounter.longship'}],
    'byKind':{'treasure_chest':{'unclaimed':'gui.encounter.treasure','claimed':'gui.encounter.treasure-empty'}},
    'conditional':[{'assetId':'gui.encounter.hermit','useOnlyWhen':'Quest site narrative really describes a hermit/hut. A defeat-target quest must still show its actual target and state.'}],
    'fallback':'gui.encounter.crossroads','note':'Use current typed site discriminants in implementation; byKind is a semantic mapping, not a new simulation schema. Never choose art by localized title. For encounters where crossroads misrepresents the place, omit the illustration or use the existing current mission art.'})
required=[f'creature.{f}.tier{t}.{variant}.portrait' for f in factions for t in range(1,8) for variant in ['base','upgraded']]+['emblem.'+f for f in factions]
verified_ids={r['id'] for r in reuse}
required_missing=[key for key in required if key not in verified_ids]
if required_missing: raise ValueError(required_missing)
report={'newNativeAssets':len(assets),'newRuntimeBytes':sum(a['bytes'] for a in assets.values()),'transparentAssets':sum(a['hasTransparency'] for a in assets.values()),
 'verifiedReuseAssets':len(reuse),'all84FactionCreaturePortraitsVerified':True,'all6EmblemsVerified':True,'windowCoverage':len(coverage),
 'conceptRecipes':len(concepts),'missingExistingManifestFiles':missing,'sourceAndRuntimeHashesMatch':all(sha(SRC/j['file'])==sha(RUN/j['file']) for j in jobs),
 'artworkEditedByCode':False,'gameSourceChangedByThisPack':False,'integrationTests':'Not run: pack has not been integrated. Preview/browser verification recorded separately.'}
write(DOC/'asset-validation.json',report)
print(json.dumps(report,ensure_ascii=False))

# Browser gallery uses original PNGs at display size. No derived raster edits.
cards=[]
for key,a in assets.items():
    cards.append(f'<article class="asset"><a href="../../assets-runtime/{a["file"]}"><div class="checker"><img loading="lazy" src="../../assets-runtime/{a["file"]}" alt="{html.escape(key)}"></div></a><h3>{html.escape(key)}</h3><p>{a["width"]} × {a["height"]} · {"alpha" if a["hasTransparency"] else "opaque"} · {html.escape(a["kind"])}</p></article>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pantheon Realms — GUI 1.1.0 art pack</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d1821;color:#ecdfbd;font:16px/1.6 system-ui}main{max-width:1440px;margin:auto;padding:32px}h1{font:42px Georgia}h2{font:30px Georgia}a{color:#edc976}nav{display:flex;flex-wrap:wrap;gap:24px;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}.asset{background:#182831;padding:14px;min-width:0}.asset h3{font-size:15px;overflow-wrap:anywhere}.asset p{font-size:13px}.checker{height:230px;background:repeating-conic-gradient(#394951 0% 25%,#26343c 0% 50%) 0 0/24px 24px;display:flex;align-items:center;justify-content:center}.checker img{max-width:100%;max-height:100%;object-fit:contain}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:16px/1.65 system-ui;max-width:1000px} .intro{max-width:850px;color:#bdc7c9}</style><main><h1>A mythic interface, ready to build.</h1><p class="intro">36 original production layers for the Pantheon Realms 1.1.0 GUI redesign. Six faction themes. Text and controls remain live. This is an art and implementation handoff; the game has not been upgraded yet.</p><nav><a href="CLAUDE_CODE_HANDOFF_1.1.0.txt">Claude Code handoff</a><a href="component-preview.html">Interactive component preview</a><a href="../gui-concepts-2026-10-10/index.html">14 approved concept directions</a><a href="window-coverage.json">98-window mapping</a><a href="existing-art-inventory.json">Existing art to reuse</a></nav><h2>Production artwork</h2><div class="grid">'''+''.join(cards)+'''</div><h2>Implementation brief</h2><pre>'''+html.escape((DOC/'CLAUDE_CODE_HANDOFF_1.1.0.txt').read_text(encoding='utf-8'))+'''</pre></main></html>'''
(DOC/'index.html').write_text(page,encoding='utf-8')
