from pathlib import Path
import json,shutil,hashlib
from PIL import Image
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/encounters-v1.1.0';S=R/'assets-source/encounters-v1.1.0';A=R/'assets-runtime';K=A/'encounters-v1.1.0'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
old=read(A/'frontend-kit-v1.1.0/complete-assets.json')['assets'];new={}
for j in read(S/'generation-queue.json'):
 p=Path(j['destination']);assert p.exists(),p
 shutil.copy2(p,K/p.name)
 with Image.open(p) as im:
  im.load();w,h=im.size;ar=im.getchannel('A').getextrema() if 'A' in im.getbands() else [255,255]
  if j['transparent']:assert ar[0]==0,(p,ar)
 new[j['key']]=dict(file='encounters-v1.1.0/'+p.name,width=w,height=h,status='final',hasTransparency=ar[0]<255,alphaRange=ar,bytes=p.stat().st_size,sha256=sha(p),provenance='Native built-in image generator output; no code retouching or resampling.')
new['encounterkit.intro.scroll']['safeContentNormalized']=[.12,.17,.88,.83]
new['encounterkit.reward.tray']['safeContentNormalized']=[.11,.25,.89,.75]
save(K/'manifest.json',dict(assets=new))
keys=['gui.control.socket','gui.control.button','gui.surface.parchment','gui.surface.leather','gui.surface.stone','icon.ui.swap','icon.ui.check','icon.ui.back','icon.ui.close','icon.ui.info','icon.ui.flag','icon.ui.recruit','icon.ui.upgrade','icon.ui.sword2','icon.ui.beacon','icon.ui.gift','icon.ui.star','icon.stat.xp','icon.stat.mana','icon.stat.movement','icon.stat.attack','icon.stat.defense','icon.stat.power','icon.stat.knowledge','frontendkit.icon.warning']
needed={k:old[k] for k in keys}
needed.update({k:v for k,v in old.items() if k.startswith(('hero.','creature.','mission.','campaign.','emblem.','icon.res.','icon.artifact.','gui.frame.','town.')) and not k.endswith('.sprite')})
needed.update(new)
files={}
for key,v in needed.items():
 p=A/v['file'];assert p.exists(),key
 files[v['file']]=dict(destinationRelative='assets-runtime/'+v['file'],bytes=p.stat().st_size,sha256=sha(p),assetFile=v['file'])
save(D/'copy-inventory.json',dict(files=list(files.values())));save(K/'dependencies.json',dict(assets=needed,note='Additive dictionary. Preserve authoritative target metadata and resolve differing files before copying. All IDs used by the reference screens and reusable hero/mission/reward families are included.'))
plan=read(R/'assets-source/sprites/content-plan.json')
factions=['greek','norse','egyptian','japanese','celtic','mesoamerican'];samples={}
hero_map=[]
for k,v in old.items():
 if k.startswith('hero.') and k.endswith('.portrait'):
  b=k[:-len('.portrait')]+'.bust';hero_map.append(dict(portraitAssetId=k,bustAssetId=b if b in old else None,portraitFile=v['file'],bustFile=old[b]['file'] if b in old else None,fallback='Use square actual portrait in a medallion; do not invent or borrow another hero.'))
save(D/'hero-art-map.json',dict(heroes=hero_map))
for f in factions:
 busts=[k for k in needed if k.startswith('hero.'+f+'.') and k.endswith('.bust')]
 if f=='greek':busts=['hero.greek.alexios.bust','hero.greek.ione.bust']
 if f=='norse':busts=['hero.norse.hervor.bust','hero.norse.hrafn.bust']
 samples[f]=dict(background='encounterkit.meeting.'+f,emblem='emblem.'+f,heroes=[dict(assetId=k,name=k.split('.')[2].replace('_',' ').title()) for k in busts[:2]],creatures=[dict(id=c['id'],name=c['name'],portrait=c['portraitAssetId']) for c in plan['creatures'] if c['pantheonId']==f and c['form']=='base'])
data=dict(assets=needed,samples=samples,note='Illustrative sample armies and reward quantities, not a legal saved game or a rules engine. Intro sample is The Silent Shore, current catalog text.')
(D/'data.js').write_text('window.ENCOUNTER_DATA='+json.dumps(data,ensure_ascii=False)+';',encoding='utf8')
bindings={
'hero-meeting':dict(component='packages/ui/src/dialogs/Overlays.tsx#TransferDialog',backgroundByPantheon={f:'encounterkit.meeting.'+f for f in factions},heroArt='hero-art-map.json',slots='gui.control.socket',transferIcon='icon.ui.swap',frame='gui.frame.<acting pantheon>',garrisonFallback='Actual town background + town name, no invented second hero',behavior='Keep quoteTransfer and TransferStack; Done closes only. Existing destination click commits immediately. No new Apply transaction or artifact exchange.'),
'scenario-introduction':dict(component='packages/ui/src/dialogs/Overlays.tsx#BriefingDialog',scroll='encounterkit.intro.scroll',missionArt='briefingArt(mission.thumbnailAssetId), fallback MissionThumb',hero='Actual protagonist portrait or existing speaker bust',objectives=['icon.ui.recruit','icon.ui.upgrade','icon.ui.sword2','icon.ui.beacon','icon.ui.flag'],behavior='Show current unlocked objectives, resolve mission text, preserve dialogue pages and Begin closeOverlay. Do not recreate session or reveal unrevealed map.'),
'reward-presentation':dict(components=['packages/ui/src/dialogs/WorldDialogs.tsx','packages/ui/src/screens/BattleResult.tsx'],tray='encounterkit.reward.tray',resources='icon.res.<resource key>',experience='icon.stat.xp',mana='icon.stat.mana',movement='icon.stat.movement',attributes='icon.stat.<attribute>',artifacts='catalog.artifacts[id].iconAssetId',creatures='catalog.creatures[id].presentation.portraitAssetId',entitlements='icon.ui.gift with actual entitlement name',behavior='Present committed outcome once. Continue only dismisses/preserves pending decision queue. Selection previews must say possible rewards. Costs separate. Respect artifact cache locations and XP caps.')}
save(D/'screen-bindings.json',bindings)
save(D/'asset-validation.json',dict(status='passed',newAssets=len(new),verifiedRuntimeFiles=len(files),runtimeMiB=round(sum(v['bytes'] for v in files.values())/1048576,1),heroPortraitMappings=len(hero_map),bustsAvailable=sum(x['bustAssetId'] is not None for x in hero_map),concepts='Reference screens assembled in HTML/CSS from the supplied assets; screenshots are preview-only.'))
print(json.dumps(read(D/'asset-validation.json')))
