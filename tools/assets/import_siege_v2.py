"""Register native siege-v2 PNGs and atlas rectangles. Never retouch, resize or re-encode pixels.

Python dependencies: Pillow, numpy, scipy (read-only alpha analysis).
The original generated atlases remain intact; Pixi samples the measured rectangles at runtime.
"""
from pathlib import Path
import json
import shutil
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets-source/siege-v2'
RUNTIME = ROOT / 'assets-runtime/siege-v2'
PANTHEONS = ['greek', 'norse', 'egyptian', 'japanese', 'celtic', 'mesoamerican']

def separator(counts, lo, hi):
    """Choose the middle of the quietest gutter near an expected third."""
    start, end = round(len(counts)*lo), round(len(counts)*hi)
    smoothed = np.convolve(counts.astype(float), np.ones(7)/7, mode='same')
    quiet = smoothed[start:end]
    candidates = np.flatnonzero(quiet <= quiet.min()+2)
    return start + int(candidates[len(candidates)//2])

def atlas_entries(file, pantheon):
    with Image.open(file) as image:
        if image.mode != 'RGBA': raise ValueError(f'{file.name}: RGBA required')
        a = np.array(image.getchannel('A'))
    mask = a > 180
    if (a == 0).mean() < 0.1: raise ValueError(f'{file.name}: transparent gutters missing')
    h,w = a.shape
    yy = [0, separator(mask.sum(axis=1), .30,.43), separator(mask.sum(axis=1), .65,.78), h]
    boxes = {}
    for row,state in enumerate(['intact','damaged','rubble']):
        strip = mask[yy[row]:yy[row+1]]
        xx = [0, separator(strip.sum(axis=0), .29,.42), separator(strip.sum(axis=0), .60,.72), w]
        for col,kind in enumerate(['gate','tower','keep']):
            cell=strip[:,xx[col]:xx[col+1]]
            labels,count=ndimage.label(cell)
            sizes=np.bincount(labels.ravel()); slices=ndimage.find_objects(labels)
            parts=[s for i,s in enumerate(slices,1) if s and sizes[i]>300]
            if not parts: raise ValueError(f'{file.name}: missing {kind}.{state}')
            top=min(s[0].start for s in parts)+yy[row]; bottom=max(s[0].stop for s in parts)+yy[row]
            left=min(s[1].start for s in parts)+xx[col]; right=max(s[1].stop for s in parts)+xx[col]
            # Padding stays inside the gutter bounds. The PNG itself is never cut or edited.
            box=[max(xx[col],left-3),max(yy[row],top-3),min(xx[col+1],right+3),min(yy[row+1],bottom+3)]
            boxes[(kind,state)]=box
    entries={}
    for kind,target in [('gate',102),('tower',74),('keep',142)]:
        max_width=max(b[2]-b[0] for (k,_),b in boxes.items() if k==kind)
        ground_depth=max_width*({'gate':.14,'tower':.16,'keep':.14}[kind])
        for state in ['intact','damaged','rubble']:
            x,y,x1,y1=boxes[(kind,state)]; fw,fh=x1-x,y1-y
            entries[f'{kind}.{state}.{pantheon}']={
                'file':f'siege-v2/{file.name}', 'frame':[x,y,fw,fh], 'width':fw,'height':fh,
                'anchor':[.5,round(1-ground_depth/fh,5)], 'pixelsPerHex':round(max_width/target*(3**.5*40),5),
                'status':'final','provenance':'Built-in image generator, 2026-10-10 siege revision 2; native PNG atlas, measured frame and footprint; no pixel retouching or enlargement.'}
    return entries

def main():
    RUNTIME.mkdir(parents=True,exist_ok=True)
    manifest={'version':2,'ground':{},'siege':{}}
    for p in PANTHEONS:
        ground=SOURCE/f'ground.{p}.png'; kit=SOURCE/f'kit.{p}.png'
        if ground.exists():
            with Image.open(ground) as im: w,h=im.size
            shutil.copy2(ground,RUNTIME/ground.name)
            manifest['ground'][f'battlefield.siege.ground.{p}']={'file':f'siege-v2/{ground.name}','width':w,'height':h}
        if kit.exists():
            shutil.copy2(kit,RUNTIME/kit.name)
            manifest['siege'].update(atlas_entries(kit,p))
        wall=SOURCE/f'wall.{p}.png'
        if wall.exists():
            with Image.open(wall) as im:
                if im.mode!='RGBA': raise ValueError(f'{wall.name}: alpha required')
                a=np.array(im.getchannel('A'))
            h,w=a.shape; mask=a>180
            xx=[0,separator(mask.sum(axis=0),.29,.42),separator(mask.sum(axis=0),.60,.74),w]
            shutil.copy2(wall,RUNTIME/wall.name)
            for col,state in enumerate(['intact','damaged','rubble']):
                counts=mask[:,xx[col]:xx[col+1]].sum(axis=0)
                ink=np.flatnonzero(counts>h*.04)
                if not len(ink):raise ValueError(f'{wall.name}: missing {state}')
                left=max(xx[col],xx[col]+int(ink[0])-2); right=min(xx[col+1],xx[col]+int(ink[-1])+3)
                manifest['siege'][f'wall.{state}.{p}']={
                    'file':f'siege-v2/{wall.name}','frame':[left,0,right-left,h], 'width':right-left,'height':h,
                    'anchor':[.5,.5],'pixelsPerHex':right-left, 'layout':'wall-strip','status':'final',
                    'provenance':'Built-in image generator, 2026-10-10 siege revision 2; native continuous wall strip. Global row UVs connect cells without repeating capped blocks.'}
    works=SOURCE/'groundworks-capped.png'
    if works.exists():
        with Image.open(works) as im:a=np.array(im.getchannel('A'))
        h,w=a.shape;mid=w//2
        shutil.copy2(works,RUNTIME/works.name)
        for name,x0,x1 in [('ditch',0,mid),('bridge',mid,w)]:
            ys,xs=np.nonzero(a[:,x0:x1]>180)
            left=max(x0,x0+int(xs.min())-2);right=min(x1,x0+int(xs.max())+3)
            top=0 if name=='ditch' else max(0,int(ys.min())-2)
            bottom=h if name=='ditch' else min(h,int(ys.max())+3)
            manifest['siege'][f'ground.{name}']={'file':f'siege-v2/{works.name}', 'frame':[left,top,right-left,bottom-top],
                'width':right-left,'height':bottom-top,'anchor':[.5,.5],'pixelsPerHex':right-left,
                'status':'final','provenance':'Built-in image generator, 2026-10-10; shared registered moat and bridge, native atlas sampling.'}
        ditch=manifest['siege']['ground.ditch']
        x,y,dw,dh=ditch['frame'];cap=round(h*.20)
        for suffix,fy,fh in [('top',0,cap),('bottom',h-cap,cap)]:
            manifest['siege'][f'ground.ditch.{suffix}']={**ditch,'frame':[x,fy,dw,fh],'width':dw,'height':fh}
        ditch['frame']=[x,cap,dw,h-2*cap];ditch['height']=h-2*cap
    (RUNTIME/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(f"Registered {len(manifest['ground'])} whole-view backgrounds and {len(manifest['siege'])} sprite states (native atlas rectangles).")

if __name__ == '__main__': main()
