from pathlib import Path
from PIL import Image
import json,hashlib,csv,html
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/hero-portraits-complete';A=R/'assets-runtime';S=R/'assets-source/hero-portraits-complete';K=A/'hero-portraits-complete'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=read(D/'hero-audit.json')['heroes'];assets={};new={};inventory={};problems=[]
variants=read(D/'selected-variants.json')
def include(p):
 rel=p.relative_to(R).as_posix();inventory[rel]={'destinationRelative':rel,'bytes':p.stat().st_size,'sha256':sha(p)}
for row in rows:
 bid=row['bustAssetId'];p=R/row['existingBustFile'] if row['existingBustFile'] else K/variants.get(bid,{}).get('file',f'{bid}.png')
 row['bustFile']=p.relative_to(R).as_posix() if p.is_file() else None
 row['status']='existing' if row['existingBustFile'] else ('generated' if p.is_file() else 'pending')
 include(R/row['portraitFile']);include(Path(row['referenceFile']))
 if not p.is_file():continue
 with Image.open(p) as im:
  im.load();w,h=im.size
  if 'A' not in im.getbands():problems.append(f'{bid}: no alpha');continue
  alpha=im.getchannel('A');lo,hi=alpha.getextrema();box=alpha.getbbox();hist=alpha.histogram()
  if lo!=0 or hi<230:problems.append(f'{bid}: alpha range {lo},{hi}')
  rec=dict(file=p.relative_to(A).as_posix(),kind='bust',width=w,height=h,alphaBox=[round(box[0]/w,5),round(box[1]/h,5),round(box[2]/w,5),round(box[3]/h,5)],alphaRange=[lo,hi],transparentFraction=round(hist[0]/(w*h),4),sha256=sha(p),bytes=p.stat().st_size,status='final',provenance='Existing owner artwork' if row['existingBustFile'] else 'Built-in image generator, identity reference in generation-queue.json. Native PNG, no code retouching or resizing.')
 assets[bid]=rec;row['dimensions']=[w,h];row['alphaBox']=rec['alphaBox'];include(p)
 if not row['existingBustFile']:
  new[bid]=rec;master=S/p.name;assert master.is_file() and sha(master)==sha(p);include(master)
pending=[r['bustAssetId'] for r in rows if r['status']=='pending']
write(K/'manifest.json',dict(provenance='54 missing hero character portraits, matching existing square portraits. Additive production pack.',assets=new))
write(K/'all-hero-busts.json',dict(note='89 identities; heroId is null for 15 art-only characters. Do not add those to gameplay automatically.',assets=assets))
write(D/'hero-map.json',dict(heroes=rows))
write(D/'copy-inventory.json',dict(files=list(inventory.values())) )
with (D/'hero-map.csv').open('w',newline='',encoding='utf-8-sig') as f:
 fields=['heroId','name','pantheon','inCurrentCatalog','title','classId','portraitAssetId','portraitFile','bustAssetId','bustFile','status'];writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(rows)
report=dict(status='passed' if not pending and not problems else 'in-progress',catalogHeroes=sum(r['inCurrentCatalog'] for r in rows),mappedIdentities=len(rows),existingBusts=sum(r['status']=='existing' for r in rows),newBusts=len(new),pending=pending,problems=problems,runtimeBytes=sum(x['bytes'] for x in assets.values()),scope='Art and handoff only; application code and game catalog unchanged.')
write(D/'validation.json',report)
cards=[]
for r in rows:
 e=html.escape;portrait='../../'+r['portraitFile'];bust='../../'+r['bustFile'] if r['bustFile'] else ''
 cards.append(f'<article data-faction="{r["pantheon"]}" data-status="{r["status"]}" data-name="{e(r["name"].lower())}"><header><h2>{e(r["name"])}</h2><span>{r["pantheon"]} · {r["status"]}</span></header><div class="pair"><img class="small" src="{portrait}" alt="Original square portrait of {e(r["name"])}" loading="lazy">'+(f'<a href="{bust}"><img class="bust" src="{bust}" alt="Large portrait of {e(r["name"])}" loading="lazy"></a>' if bust else '<p>Generation pending</p>')+f'</div><p>{e(r["title"])}</p><code>{e(r["heroId"] or "Art library only — not a catalog hero")}</code><details><summary>Asset mapping</summary><p>{e(r["portraitAssetId"])}<br>→ {e(r["bustAssetId"])}</p><p>{e(r["bustFile"] or "pending")}</p></details></article>')
 page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pantheon Realms — Complete Hero Portraits</title><style>*{box-sizing:border-box}body{background:#081421;color:#ead6b2;font:16px/1.5 system-ui;margin:0;padding:28px}h1,h2{font-family:Georgia,serif}h1{font-size:40px}h2{font-size:23px;margin:0}a{color:#e5bd70}nav{display:flex;gap:25px;flex-wrap:wrap;margin:20px 0}input,select{font:inherit;background:#182b3b;color:#f5e0bb;border:1px solid #846a3d;padding:10px;margin:8px 8px 8px 0;max-width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(370px,100%),1fr));gap:22px}article{background:#122635;border:1px solid #846a3d;padding:18px;min-width:0}header span{color:#b7a88e;font-size:13px}.pair{display:grid;grid-template-columns:25% 75%;align-items:start;margin-top:15px;background:repeating-conic-gradient(#1b3341 0 25%,#0b1d2a 0 50%) 0/24px 24px}.pair img{max-width:100%;display:block}.small{border:1px solid #c4a163}.bust{width:100%;height:440px;object-fit:contain;object-position:bottom}code,details{font-size:12px;overflow-wrap:anywhere}details{margin-top:10px}[hidden]{display:none!important}button{font:inherit;padding:10px;background:#c9a263;border:0;color:#071521;cursor:pointer}:focus-visible{outline:3px solid #f5d995;outline-offset:3px}@media(max-width:500px){body{padding:14px}h1{font-size:30px}}</style><h1>Every hero, a complete portrait</h1><p>Original square portraits beside independent transparent character cutouts. Existing artwork is preserved. Full portraits here are large dialogue/tavern character illustrations, not map sprites or rigged models.</p><nav><a href="CLAUDE_HANDOFF.txt">Claude Code handoff</a><a href="hero-map.csv">Complete mapping CSV</a><a href="hero-map.json">JSON mapping</a><a href="validation.json">Validation</a></nav><label>Search <input id="search" placeholder="Hero name"></label><label>Pantheon <select id="faction"><option value="">All six</option><option>celtic</option><option>egyptian</option><option>greek</option><option>japanese</option><option>mesoamerican</option><option>norse</option></select></label><label>Delivery <select id="status"><option value="">All artwork</option><option value="generated">New portraits</option><option value="existing">Existing portraits</option></select></label><p id="count"></p><div class="grid">'''+''.join(cards)+'''</div><script>const cards=[...document.querySelectorAll('article')];function filter(){let n=0;for(const c of cards){c.hidden=!!((faction.value&&c.dataset.faction!==faction.value)||(status.value&&c.dataset.status!==status.value)||(search.value&&!c.dataset.name.includes(search.value.toLowerCase())));if(!c.hidden)n++}document.querySelector('#count').textContent=n+' portraits shown'}const faction=document.querySelector('#faction'),status=document.querySelector('#status'),search=document.querySelector('#search');for(const el of [faction,status,search])el.addEventListener('input',filter);filter();</script></html>'''
 (D/'index.html').write_text(page,encoding='utf-8')
print(json.dumps(report))
