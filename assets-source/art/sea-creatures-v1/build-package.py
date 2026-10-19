from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np
import json,shutil,hashlib,html,copy

ROOT=Path(__file__).resolve().parent
PREV=ROOT.parent/'single-ship-sea-battle-2026-10-17-v2'
PREFIX='sea-creatures-v1/'
def save(name,obj): (ROOT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
for p in (PREV/'assets').glob('*.png'):shutil.copy2(p,ROOT/'assets'/p.name)
for name in ['battlefield-layout.json','sea-creature-roster.json']:
    shutil.copy2(PREV/'design'/name,ROOT/'design'/name)
shutil.copy2(PREV/'index.html',ROOT/'battlefield-preview.html')
shutil.copy2(PREV/'revision-prompts.json',ROOT/'reference/portrait-and-battlefield-prompts.json')
roster=json.loads((ROOT/'design/sea-creature-roster.json').read_text())
sources=json.loads((ROOT/'animation-sources.json').read_text())
atlas={}; warnings=[]

def components(p):
    im=Image.open(p); arr=np.asarray(im);alpha=arr[:,:,3]
    labels,n=label(alpha>32); counts=np.bincount(labels.ravel()); slices=find_objects(labels)
    out=[]
    for i in range(1,n+1):
        if counts[i]<800: continue
        y,x=slices[i-1]; out.append(dict(x=x.start,y=y.start,w=x.stop-x.start,h=y.stop-y.start,area=int(counts[i])))
    return im.size,alpha,out

def box_for_region(alpha,rect):
    x,y,w,h=rect; ys,xs=np.where(alpha[y:y+h,x:x+w]>8)
    return [x+int(xs.min()),y+int(ys.min()),int(xs.max()-xs.min()+1),int(ys.max()-ys.min()+1)] if len(xs) else rect

for key in sources:
    p=ROOT/'assets/animations'/f'{key}.png';(w,h),alpha,objs=components(p)
    rows=2 if key.startswith('fx-') else 4
    frame_rows=[]
    for row in range(rows):
        if rows==4:
            items=[o for o in objs if min(3,int((o['y']+o['h']/2)/(h/4)))==row]
            items=sorted(sorted(items,key=lambda o:o['area'],reverse=True)[:4],key=lambda o:o['x'])
            assert len(items)==4,(key,row,len(items))
            regs=[]
            for col,o in enumerate(items):
                x=max(0,o['x']-3);y=max(0,o['y']-3);rw=min(w,o['x']+o['w']+3)-x;rh=min(h,o['y']+o['h']+3)-y
                # Anchor is a stable per-pose projected body/contact point, independent of rect size.
                ax=o['x']+o['w']*.53-x; ay=o['y']+o['h']*.92-y
                edge=o['x']<=0 or o['y']<=0 or o['x']+o['w']>=w or o['y']+o['h']>=h
                reg={'rect':[x,y,rw,rh],'anchor':[round(ax,2),round(ay,2)],'sourceScale':1,'sourceCell':[row,col]}
                if edge:
                    warnings.append({'atlas':key,'cell':[row,col],'reason':'solid pixels touch canvas edge; omitted from playback'})
                regs.append({'region':reg,'exclude':edge,'bodyHeight':o['h'],'bodyWidth':o['w']})
        else:
            regs=[]
            for col in range(4):
                # Non-destructive native source rectangles; no raster cropping or image edits.
                x=round(col*w/4);y=round(row*h/2);x2=round((col+1)*w/4);y2=round((row+1)*h/2)
                # Locate transparent vertical gutter near nominal division for effects with wider trails.
                reg={'rect':[x,y,x2-x,y2-y],'anchor':[(x2-x)/2,(y2-y)/2],'sourceScale':1,'sourceCell':[row,col]}
                regs.append({'region':reg,'exclude':False,'bodyHeight':y2-y,'bodyWidth':x2-x})
        frame_rows.append(regs)
    atlas[key]={'width':w,'height':h,'rows':frame_rows,'alphaZeroFraction':round(float((alpha==0).mean()),4)}

units={}; events={}; merge={'schema':'pantheon-realms-sprites-1','notice':'Merge these creature/effect entries into the existing manifest; do not replace it wholesale. Proposed creature IDs must map to actual content IDs. Native RGBA atlases.','creatures':{},'effects':{},'projectiles':{},'projectileProfiles':{}}
upgrade_ids={'hippocampus':'tempest_hippocampus','cetus':'crownfin_cetus','hafgufa':'abyssal_hafgufa','isonade':'razorwake_isonade','triton':'stormcaller_triton'}
fps={'idle':3,'move':6,'attack':7,'hit':7,'defend':5,'shoot':6,'death':4,'victory':4,'takeoff':6,'fly':7,'landing':5}
for family in roster:
    for form in ['base','upgraded']:
        key=family['id']+'-'+form; uid=family['id'] if form=='base' else upgrade_ids[family['id']]
        core=key+'-core';actions=key+'-actions';flying=family['movement']=='fly'
        bindings={'idle':(core,0),'move':(core,1),'attack':(core,2),'hit':(core,3),'defend':(actions,0),'death':(actions,2),'victory':(actions,3)}
        if flying:
            flight=key+'-flight';bindings.update(takeoff=(flight,0),fly=(flight,1),landing=(flight,2))
        else:bindings['shoot']=(actions,1)
        animations={};core_height=float(np.median([r['bodyHeight'] for r in atlas[core]['rows'][0]]))
        for state,(sheet,row) in bindings.items():
            # The upgraded flight sheet's third row is an attack reinterpretation, so use a deliberate reverse takeoff for descent.
            if key=='hippocampus-upgraded' and state=='landing': row=0
            chosen=[r for r in atlas[sheet]['rows'][row] if not r['exclude']]
            if key=='hippocampus-upgraded' and state=='landing':chosen=list(reversed(chosen))
            assert len(chosen)>=2,(key,state,'too few usable frames')
            reference_height=float(np.median([r['bodyHeight'] for r in atlas[sheet]['rows'][0]]))
            scale=round(core_height/reference_height,4)
            regions=[dict(copy.deepcopy(r['region']),sourceScale=scale) for r in chosen]
            strip={'file':PREFIX+'animations/'+sheet+'.png','frames':len(regions),'frameWidth':max(r['rect'][2] for r in regions),'frameHeight':max(r['rect'][3] for r in regions),'fps':fps[state],'loop':state in ['idle','move','fly'],'anchor':[.5,.92],'regions':regions,'status':'final'}
            if key=='hippocampus-upgraded' and state=='landing':strip['aliasOf']='takeoff (reverse pose order; descent to hover)'
            animations[state]=strip
        typical_width=float(np.median([r['bodyWidth'] for r in atlas[core]['rows'][0]]))
        pixels_per_hex=round(typical_width/(1.7 if family['footprint']==2 else 1.08),2)
        sprite={'status':'final','provenance':'Built-in image_gen; native alpha atlases; measured source rectangles; no pixel edits. Four-pose animation cycles, not interpolated 3D animation.','facing':'right','pixelsPerHex':pixels_per_hex,'animations':animations}
        merge['creatures'][uid]=sprite
        units[uid]={'id':uid,'name':family['baseName'] if form=='base' else family['upgradeName'],'family':family['id'],'form':form,'movement':family['movement'],'footprint':family['footprint'],'portrait':'assets/'+key+'.png','sprite':sprite}
        events[uid]={'attack':{'contactFrame':min(2,animations['attack']['frames']-1),'returnTo':'idle'},'death':{'holdLastFrame':True,'onWater':'after pose completes, translate down 0.12 hex and fade over 450ms; cosmetic only','onDeck':'hold last pose, no sinking'},'hover':{'idleHeightHex':.12 if flying else 0,'travelHeightHex':.4 if flying else 0},'meleeMovement':'short lunge stays in legal origin; never moves logical footprint'}
        if not flying:
            shoot=animations['shoot']; events[uid]['shoot']={'releaseFrame':min(2,shoot['frames']-1),'returnTo':'idle','sourcePoint':'conch-bell' if family['id']=='triton' else 'tail-tip' if family['id']=='isonade' else 'mouth','socketNormalizedInReleaseRect':[.88,.40 if family['id']=='isonade' else .45]}

fx_data={}
fx_families={'cetus':'brine-jet','hafgufa':'deepwater-blast','isonade':'barbed-spray','triton':'conch-pulse'}
for family,fx in fx_families.items():
    sheet='fx-'+fx; a=atlas[sheet]; file=PREFIX+'animations/'+sheet+'.png'
    travel=[r['region'] for r in a['rows'][0]];impact=[r['region'] for r in a['rows'][1]]
    effect_id='sea.'+fx+'.impact';projectile_id='sea.'+fx
    impactstrip={'file':file,'frames':4,'frameWidth':max(r['rect'][2] for r in impact),'frameHeight':max(r['rect'][3] for r in impact),'fps':8,'loop':False,'anchor':[.5,.5],'regions':impact,'pixelsPerHex':a['width']/4,'status':'final','provenance':'Native generated RGBA, no pixel edits','additive':False}
    merge['effects'][effect_id]=impactstrip
    merge['projectiles'][projectile_id]={'file':file,'frame':travel[0]['rect'],'width':travel[0]['rect'][2],'height':travel[0]['rect'][3],'anchor':[.5,.5],'pixelsPerHex':a['width']/4,'status':'final','provenance':'Native generated RGBA'}
    facing='left' if fx=='deepwater-blast' else 'right'
    fx_data[family]={'file':file,'travel':travel,'impact':impactstrip,'travelFps':8,'nativeFacing':facing,'travelRotationOffsetRad':3.141592653589793 if facing=='left' else 0,'impactRotationOffsetRad':0}
    for uid in [family,upgrade_ids[family]]:
        merge['projectileProfiles'][uid]={'unitId':uid,'displayName':units[uid]['name'],'variant':units[uid]['form'],'file':file,'travel':travel,'travelFps':8,'travelPlayback':'static' if family=='isonade' else 'loop','impactEffectId':effect_id,'projectileId':projectile_id,'impactFps':8,'impactFadeLastMs':150,'path':'direct','durationMsRange':[220,650],'sourcePoint':events[uid]['shoot']['sourcePoint'],'sizeHex':.7 if family=='isonade' else .9,'impactSizeHex':1.1,'blend':'normal'}

save('sprite-manifest-merge.json',merge)
save('animation-events.json',{'schema':'sea-animation-events-1','simulationIndependent':True,'units':events,'fxOrientation':{k:{'travelRotationOffsetRad':v['travelRotationOffsetRad'],'impactRotationOffsetRad':0} for k,v in fx_data.items()}})
viewer={'units':units,'fx':fx_data,'runtimePrefix':PREFIX,'background':'assets/single-ship-battlefield.png','events':events}
save('animation-manifest.json',viewer)
(ROOT/'viewer-data.js').write_text('window.SEA_ANIMATIONS='+json.dumps(viewer,ensure_ascii=False)+';\n',encoding='utf-8')
save('design/frame-review.json',{'method':'Native alpha component measurement; body >800 pixels at alpha >32; small detached fragments not part of body rectangles; 3px padding. Whole-image pixels unchanged.','excludedFrames':warnings,'semanticSubstitutions':[{'unit':'tempest_hippocampus','animation':'landing','uses':'reverse takeoff','reason':'generated third flight row repeated attack poses; not used for descent'}],'atlases':atlas})
manifest=[]
for p in sorted((ROOT/'assets').rglob('*.png')):
    with Image.open(p) as im: w,h=im.size;mode=im.mode
    manifest.append({'file':p.relative_to(ROOT).as_posix(),'width':w,'height':h,'mode':mode,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'runtimePath':PREFIX+p.relative_to(ROOT/'assets').as_posix()})
save('asset-manifest.json',{'assets':manifest,'generator':'built-in image_gen','pixelEditing':False,'nativeResolutionPreserved':True,'gameFilesModified':False})
report={'creatureForms':len(units),'creatureAnimationProfiles':sum(len(u['sprite']['animations']) for u in units.values()),'creatureAtlases':sum(not k.startswith('fx-') for k in sources),'fxAtlases':sum(k.startswith('fx-') for k in sources),'artFiles':len(manifest),'excludedFrames':len(warnings),'animationReferencesWithinImages':True,'allRequiredStates':True}
for uid,u in units.items():
    needed=['idle','move','attack','defend','hit','death','victory']+(['takeoff','fly','landing'] if u['movement']=='fly' else ['shoot'])
    assert all(s in u['sprite']['animations'] for s in needed)
    for s in u['sprite']['animations'].values():
        p=ROOT/'assets'/s['file'].removeprefix(PREFIX);w,h=Image.open(p).size
        for r in s['regions']:
            x,y,rw,rh=r['rect'];assert x>=0 and y>=0 and x+rw<=w and y+rh<=h and 0<=r['anchor'][0]<=rw and 0<=r['anchor'][1]<=rh
save('design/validation.json',report)
print(json.dumps(report,indent=2));print('EXCLUSIONS',warnings)
