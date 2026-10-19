from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse
import json, hashlib, zipfile
from PIL import Image

root=Path(__file__).resolve().parent
manifest=json.loads((root/'asset-manifest.json').read_text(encoding='utf-8'))
sources=json.loads((root/'animation-sources.json').read_text(encoding='utf-8'))
previous=root.parent/'single-ship-sea-battle-2026-10-17-v2'
for a in manifest['assets']:
    p=root/a['file']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],p
    with Image.open(p) as im: assert list(im.size)==[a['width'],a['height']] and im.mode==a['mode'],p
    if p.parent.name=='animations': original=Path(sources[p.stem])
    else: original=previous/'assets'/p.name
    assert p.read_bytes()==original.read_bytes(),('native bytes changed',p)

class Links(HTMLParser):
    def __init__(self): super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ('src','href') and v:self.links.append(v)
checked=0
for doc in root.glob('*.html'):
    parser=Links();parser.feed(doc.read_text(encoding='utf-8'))
    for link in parser.links:
        url=urlparse(link)
        if url.scheme or not url.path:continue
        assert (doc.parent/unquote(url.path)).exists(),('broken link',doc.name,link)
        checked+=1

layout=json.loads((root/'design/battlefield-layout.json').read_text(encoding='utf-8'))
cells=layout['cells'];assert len(cells)==176
assert len({(c['col'],c['row']) for c in cells})==176
assert sum(c['zone']=='deck' for c in cells)==88
assert sum(c['zone']=='water' for c in cells)==88
def cube(c):
    q=c['col']-(c['row']-(c['row']&1))//2;r=c['row'];return q,-q-r,r
def dist(a,b):return max(abs(x-y) for x,y in zip(cube(a),cube(b)))
deck=[c for c in cells if c['zone']=='deck']; edge=[c for c in cells if c['col']==8]
max_rail_range=max(min(dist(a,b) for b in edge) for a in deck)
max_board_range=max(dist(a,b) for a in cells for b in cells)
assert max_rail_range<=8 and max_board_range<=24
report={'artFiles':len(manifest['assets']),'nativeBytesMatchSources':True,'relativeHtmlLinksChecked':checked,'brokenLinks':[],
        'deckCells':88,'waterCells':88,'maxDeckDistanceFromNearestWaterEdge':max_rail_range,'maxBoardDistance':max_board_range,
        'browserReport':json.loads((root/'design/browser-validation.json').read_text(encoding='utf-8'))}
(root/'design/delivery-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
zip_path=root.with_suffix('.zip')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file():z.write(p,Path(root.name)/p.relative_to(root))
with zipfile.ZipFile(zip_path) as z:assert z.testzip() is None
print(json.dumps(report,indent=2));print('ZIP',zip_path,round(zip_path.stat().st_size/1048576,1),'MiB')
