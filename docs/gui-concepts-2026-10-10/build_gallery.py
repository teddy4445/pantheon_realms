from pathlib import Path
import json,shutil
from PIL import Image
root=Path(__file__).parent
items=json.loads((root/'concepts.json').read_text('utf8'))
catalog=json.loads((root.parent/'gui-review-2026-10-10/catalog.json').read_text('utf8'))
byid={r['id']:r for r in catalog}
(root/'current').mkdir(exist_ok=True)
for c in items:
 p=root/c['file']
 assert p.is_file(),p
 with Image.open(p) as im:c['dimensions']=list(im.size);im.verify()
 if c['reference']:
  src=Path(c['reference']);dest=root/'current'/src.name
  shutil.copy2(src,dest);c['before']='current/'+src.name
 else:c['before']=None
 c['codeFiles']=list(dict.fromkeys(byid[x]['sourceAbsolute'] for x in c['catalog']))
 for s in c['codeFiles']:assert Path(s).is_file(),s
html=(root/'gallery-template.html').read_text('utf8').replace('__DATA__',json.dumps(items,ensure_ascii=False).replace('</','<\\/'))
(root/'index.html').write_text(html,'utf8')
(root/'concepts.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),'utf8')
print(json.dumps({'concepts':len(items),'images_verified':len(items),'current_captures':len(list((root/'current').glob('*.jpg'))),'dimensions':sorted(set(tuple(x['dimensions']) for x in items))},indent=2))
