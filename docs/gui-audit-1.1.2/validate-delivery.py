from pathlib import Path
from html.parser import HTMLParser
from PIL import Image,ImageChops
import json,hashlib
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/gui-audit-1.1.2'
manifest=json.loads((R/'assets-runtime/siege-gates-v3/manifest.json').read_text())['siege']
ids=['greek','norse','egyptian','japanese','celtic','mesoamerican'];states=['intact','damaged','rubble']
assert set(manifest)=={f'gate.{state}.{id}' for id in ids for state in states}
checks=[]
for id in ids:
 file=R/'assets-runtime/siege-gates-v3'/f'gate.{id}-v5.png';im=Image.open(file);im.load();assert im.size==(1536,1024) and im.mode=='RGBA'
 assert file.read_bytes()==(R/'assets-source/siege-gates-v3'/file.name).read_bytes()
 for state in states:
  r=manifest[f'gate.{state}.{id}'];x,y,w,h=r['frame'];assert 0<=x<x+w<=im.width and 0<=y<y+h<=im.height
  assert all(0<=v<=1 for v in r['anchor']) and r['pixelsPerHex']>0 and r['status']=='final'
 mid_alpha=im.getchannel('A').crop((1024,512,1536,513)).getextrema()[1]
 assert mid_alpha<64,(id,'Breach center is not sufficiently transparent',mid_alpha)
 base=Image.open(D/f'siege-prototype-{id}.png').convert('RGB').crop((925,475,995,610))
 differences={}
 for state in ['damaged','rubble']:
  other=Image.open(D/f'siege-prototype-{id}-{state}.png').convert('RGB').crop((925,475,995,610))
  diff=ImageChops.difference(base,other);differences[state]=sum(max(px)>10 for px in diff.getdata());assert differences[state]>40
 checks.append({'pantheon':id,'breachCenterMaxAlpha':mid_alpha,'gateRegionChangedPixels':differences,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
class Links(HTMLParser):
 def __init__(self):super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href') and v and not v.startswith(('#','http:','https:','data:')):self.paths.append(v.split('#')[0])
p=Links();p.feed((D/'index.html').read_text(encoding='utf-8'));missing=[s for s in p.paths if not (D/s).exists()];assert not missing,missing
cat=json.loads((D/'catalog.json').read_text());assert len(cat)==98
for x in cat:
 with Image.open(D/x['screenshot']) as im:im.verify()
result={'status':'passed','catalogScreens':len(cat),'atlases':6,'stateMappings':18,'localLinksChecked':len(p.paths),'missingLinks':missing,'gateChecks':checks,'scope':'File integrity, alpha and isolated prototype image changes only. Production source integration and movement-through-breach acceptance remain for Claude.'}
(D/'delivery-validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
