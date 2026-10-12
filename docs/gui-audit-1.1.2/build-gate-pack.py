from pathlib import Path
from PIL import Image
import json,hashlib
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/gui-audit-1.1.2';S=R/'assets-source/siege-gates-v3';T=R/'assets-runtime/siege-gates-v3'
selected=json.loads((S/'generation-records.json').read_text(encoding='utf-8'))
assets={};checks=[]
for row in selected:
 p=T/row['file'];im=Image.open(p);im.load();w,h=im.size;a=im.getchannel('A');assert a.getextrema()[0]==0
 assert p.read_bytes()==(S/row['file']).read_bytes()
 stateRows=[]
 for i,state in enumerate(['intact','damaged','rubble']):
  x0=round(i*w/3);x1=round((i+1)*w/3);cw=x1-x0
  box=a.crop((x0,0,x1,h)).point(lambda v:255 if v>20 else 0).getbbox();assert box
  # Registration is measured from the north wall connector, never the damage-dependent silhouette box.
  samples=[]
  for yy in range(round(h*.10),round(h*.14)):
   xs=[xx for xx in range(x0,x1) if a.getpixel((xx,yy))>240]
   if xs:samples.append((min(xs)+max(xs))/2-x0)
  axis=sum(samples)/len(samples) if samples else (box[0]+box[2])/2
  anchor=[round(axis/cw,6),.5]
  rec={'file':'siege-gates-v3/'+p.name,'frame':[x0,0,cw,h],'width':cw,'height':h,'anchor':anchor,'pixelsPerHex':round(h*.27*69.282032/44.4,5),'status':'final','provenance':'Built-in image generator; native alpha atlas; metadata only, no raster retouching. Integration scale/joins require the supplied visual review.','alphaBounds':list(box),'registration':{'passageCenter':[round(axis,2),round(h*.5,2)],'passageDirection':'screen-left-to-right','wallDirection':'screen-top-to-bottom','startingPassagePitchPixels':round(h*.27,2)}}
  assets[f'gate.{state}.{row["id"]}']=rec;stateRows.append({'state':state,'alphaBounds':box,'anchor':anchor})
 checks.append({'pantheon':row['id'],'file':p.name,'size':[w,h],'alphaRange':a.getextrema(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'states':stateRows})
(T/'manifest.json').write_text(json.dumps({'version':3,'note':'Gate-only overlay. Preserve v2 ground, walls, towers, keeps. Registration is a starting fit; consult handoff before merge.','siege':assets},indent=2),encoding='utf-8')
(D/'gate-validation.json').write_text(json.dumps({'status':'passed-file-checks','atlases':len(checks),'stateRecords':len(assets),'checks':checks,'gameIntegration':'not applied'},indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
