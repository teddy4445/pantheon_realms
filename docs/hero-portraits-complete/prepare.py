from pathlib import Path
import json
from PIL import Image
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/hero-portraits-complete';S=R/'assets-source/hero-portraits-complete';A=R/'assets-runtime/hero-portraits-complete'
S.mkdir(exist_ok=True);A.mkdir(exist_ok=True)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
catalog=read(D/'catalog-heroes.json')['heroes'];assets=read(R/'assets-runtime/adventure-gui-v1.1.0/complete-assets.json')['assets']
by_portrait={h['portraitAssetId']:h for h in catalog}
portrait_ids=sorted(set(by_portrait)|{k for k in assets if k.startswith('hero.') and k.endswith('.portrait')})
rows=[];jobs=[]
for pid in portrait_ids:
 h=by_portrait.get(pid);faction=pid.split('.')[1];slug=pid.split('.')[2];bid=pid.replace('.portrait','.bust')
 portrait=R/'assets-runtime'/assets[pid]['file']
 source=R/'assets-source/icons/final'/f'{pid}.png'
 ref=source if source.is_file() else portrait
 existing=R/'assets-runtime'/assets[bid]['file'] if bid in assets else None
 if existing and not existing.is_file():existing=None
 row=dict(heroId=h['id'] if h else None,name=h['name'] if h else slug.replace('_',' ').title(),pantheon=faction,slug=slug,inCurrentCatalog=h is not None,title=h.get('title','') if h else '',biography=h.get('biography','') if h else '',classId=h.get('classId') if h else None,portraitAssetId=pid,portraitFile=str(portrait.relative_to(R)).replace('\\','/'),referenceFile=str(ref),bustAssetId=bid,existingBustFile=str(existing.relative_to(R)).replace('\\','/') if existing else None,status='existing' if existing else 'pending')
 rows.append(row)
 if not existing:
  filename=f'{bid}.png'
  prompt=f"Use case: identity-preserve. Create the missing large transparent character portrait for Pantheon Realms hero {row['name']} ({faction} pantheon). Input image 1 is the authoritative existing face-and-shoulder portrait: preserve exactly the recognizable identity, gender presentation, apparent age, skin tone, facial features, hairstyle, hair color, beard, headgear and distinctive clothing palette. Expand this same character into a polished generous head-to-mid-thigh three-quarter standing character cutout, including both complete shoulders, arms and hands, in a relaxed confident pose. Face must be clear and large, oriented mostly toward viewer. Painterly fantasy strategy-game illustration matching the supplied portrait, ideal for tavern, dialogue, hero meeting and encyclopedia UI. Use strongly readable cloth and armor forms, restrained detailed materials; no photographic skin. Continue the existing costume naturally below the crop with fitting {faction} motifs. Character metadata: {row['title']}. {row['biography']}. The reference image governs appearance over assumptions from a famous name. No extra characters, mount, scenery, floor, pedestal, frame, medallion, labels, text or watermark. Real transparent alpha background, including gaps around arms. Portrait canvas approximately 1024 by 1536, entire hair/headgear and hands inside canvas, at least 5 percent transparent margin around upper and side silhouette. Lower garment ends cleanly at mid-thigh near bottom; do not fade the face or torso. Deliver ONE independent character only, no sheet. This is UI character artwork, not an animation or map sprite."
  jobs.append(dict(id=bid,heroId=row['heroId'],name=row['name'],faction=faction,reference=str(ref),file=filename,destination=str(S/filename),runtime=str(A/filename),prompt=prompt))
for name,data in [('hero-audit.json',dict(heroes=rows)),('generation-queue.json',jobs)]:
 (D/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
report=dict(catalogHeroes=len(catalog),portraitIdentities=len(rows),existingBusts=sum(r['status']=='existing' for r in rows),missingBusts=len(jobs),missingCatalogBusts=sum(j['heroId'] is not None for j in jobs),additionalPortraits=sum(r['heroId'] is None for r in rows),factions={f:{'total':sum(r['pantheon']==f for r in rows),'missing':sum(j['faction']==f for j in jobs)} for f in sorted(set(r['pantheon'] for r in rows))})
(D/'audit-summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report));print(json.dumps(jobs[:2],ensure_ascii=False))
