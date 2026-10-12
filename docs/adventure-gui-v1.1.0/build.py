from pathlib import Path
from PIL import Image
import json,hashlib,shutil,re
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/adventure-gui-v1.1.0';S=R/'assets-source/adventure-gui-v1.1.0';A=R/'assets-runtime';K=A/'adventure-gui-v1.1.0'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
old=read(A/'frontend-kit-v1.1.0/complete-assets.json')['assets'];old.update(read(A/'encounters-v1.1.0/manifest.json')['assets']);new={}
for j in read(S/'generation-queue.json'):
 p=S/j['file'];assert p.is_file(),p
 with Image.open(p) as im:
  im.load();w,h=im.size;ar=im.getchannel('A').getextrema() if 'A' in im.getbands() else (255,255)
  if j['transparent']:assert ar[0]==0,(j['id'],ar)
 shutil.copy2(p,K/p.name)
 new[j['id']]=dict(file='adventure-gui-v1.1.0/'+p.name,width=w,height=h,hasTransparency=ar[0]<255,alphaRange=ar,sha256=sha(p),bytes=p.stat().st_size,kind=j['kind'],status='final',provenance='Native built-in image generator output. No code retouching, cropping or upscaling.')
new['adventurekit.chrome.skill-card']['contentRect']=[.12,.54,.88,.86]
new['adventurekit.chrome.hero-medallion']['portraitNote']='Place actual portrait below the transparent circular opening; use CSS circle clipping. Name is live text.'
new['adventurekit.chrome.balance']['note']='Empty decorative scale; values and resource icons remain live. Keep aspect ratio.'
save(K/'manifest.json',dict(assets=new));assets={**old,**new}
creatures=read(R/'docs/frontend-v1.1.0/creature-art-map.json')['creatures'];plan=read(R/'assets-source/sprites/content-plan.json');plans={c['id']:c for c in plan['creatures']}
for c in creatures:
 c.pop('portraitAbsolute',None);c['summary']=plans[c['creatureId']]['summary'];c['role']=plans[c['creatureId']]['role'];c['abilities']=plans[c['creatureId']]['abilities']
hero=read(R/'docs/encounters-v1.1.0/hero-art-map.json')
factions=['greek','norse','egyptian','japanese','celtic','mesoamerican'];pairs={'greek':['alexios','ione'],'norse':['hervor','hrafn'],'egyptian':['djedkhonsu','nebet'],'japanese':['akane','genzo'],'celtic':['cathal','dubhghall'],'mesoamerican':['chimal','itzel']}
theme={}
for f in factions:
 theme[f]=dict(frame='gui.frame.'+f,emblem='emblem.'+f,banner='frontendkit.banner.'+f,tavern='adventurekit.tavern.'+f,recruitment='adventurekit.recruit.'+f,market='gui.merchant.'+f,levelup='encounterkit.meeting.'+f,spellbook='gui.book.open',heroExamples=[dict(name=h.replace('_',' ').title(),portrait=f'hero.{f}.{h}.portrait',bust=f'hero.{f}.{h}.bust' if f'hero.{f}.{h}.bust' in assets else None) for h in pairs[f]])
 for key in ['frame','emblem','banner','tavern','recruitment','market','levelup','spellbook']:assert theme[f][key] in assets
files={}
def include(rel):
 p=A/rel;assert p.is_file(),p
 if rel not in files:files[rel]=dict(destinationRelative='assets-runtime/'+rel,bytes=p.stat().st_size,sha256=sha(p))
for k,v in assets.items():
 if 'file' in v:include(v['file'])
for c in creatures:
 for a in c['animations'].values():include(a['file'])
save(K/'complete-assets.json',dict(assets=assets,note='Additive reference inventory, not a replacement master registry. Includes prior kit dependencies for a separate checkout.'))
save(D/'copy-inventory.json',dict(files=list(files.values())))
save(D/'creature-art-map.json',dict(note='102 forms including 84 faction forms and 18 neutral forms. Actual catalog wins if it changes. Preserve supplied animation metadata; do not extract artwork from screenshots.',creatures=creatures))
save(D/'hero-art-map.json',hero);save(D/'theme-map.json',theme)
roles={
 'tavern':{'component':'packages/ui/src/screens/Town.tsx#TavernModal','scene':'theme.tavern','foreground':'Actual candidate bust or same hero portrait fallback','portraitFrame':'adventurekit.chrome.hero-medallion','icons':['icon.ui.tavern','icon.stat.attack','icon.stat.defense','icon.stat.power','icon.stat.knowledge','icon.res.gold'],'behavior':'hireOptions + quoteHireHero + existing confirmation + HireHero. Preserve returning hero and weekly/scenario limits.'},
 'recruitment':{'component':'packages/ui/src/screens/Recruitment.tsx; packages/ui/src/dialogs/WorldDialogs.tsx#CampDialog','scene':'theme.recruitment','foreground':'Actual creature portrait or existing animated detail; actual building art optional','icons':['icon.ui.recruit','icon.ui.upgrade'],'behavior':'quoteRecruitment/quoteUpgrade or quoteCampRecruitment; do not merge their different commands. Destination, shared population and seven tiers stay visible.'},
 'market':{'component':'packages/ui/src/screens/Town.tsx#MarketModal','scene':'theme.market','ornament':'adventurekit.chrome.balance','icons':['icon.res.gold','icon.res.wood','icon.res.stone','icon.res.crystal','icon.ui.swap'],'behavior':'Gold intermediary only. Favor not tradable. quoteTrade supplies costs/rates/legality. Buy/sell and resource selectors remain.'},
 'levelup':{'component':'packages/ui/src/screens/LevelUp.tsx','scene':'theme.levelup','card':'adventurekit.chrome.skill-card','portraitFrame':'adventurekit.chrome.hero-medallion','icons':'Actual catalog.skills[].iconAssetId, attribute icon, actual god gifts','behavior':'Current skill click commits ChooseLevelUp once. Preserve god gift first, no-offer Continue, queued levels and decisionId guard. Concept confirm button is superseded.'},
 'spellbook':{'component':'packages/ui/src/components/spellbook.tsx','book':'gui.book.open','backdrop':'theme.levelup, dimmed; current scene can stay behind modal','icons':'Actual known spells via iconAssetId; resource mana icon and faction emblem','behavior':'Preserve read-only versus cast mode, all/battle/adventure + tier filters, known spells only, cast.options and cast.onCast. No baked illustrative combat damage.'},
 'encounter':{'component':'packages/ui/src/dialogs/Overlays.tsx#EncounterDialog','scene':'terrain-map.json, NOT hero pantheon','frame':'theme.frame','foreground':'Actual hero/creature portraits or animated details','icons':['icon.ui.sword2','icon.action.retreat','icon.ui.check','icon.ui.auto'],'behavior':'Current code shows exact counts: preserve them. Preserve quick battle, join/flee/release, siege, climate, victory rewards and checkpoint behavior. No fabricated danger score.'}}
save(D/'screen-bindings.json',roles)
terrain=dict(note='These are visual biome IDs, not new engine Terrain enum values. Resolve current map biome/climate metadata via existing environment-art logic first. The UI must never infer biome from hero or enemy pantheon. No new movement rule.',scenes={b:'adventurekit.encounter.'+b for b in ['temperate','alpine','desert','woodland','jungle','volcanic']},fallback='adventurekit.encounter.temperate',selectionHints={'snow/frozen':'alpine','sand/arid/desert':'desert','tropical/jungle':'jungle','ash/lava/volcanic':'volcanic','temperate forest':'woodland','temperate plains/rough':'temperate'},specialCases='For marsh, water, siege or an authored environment outside these visual families, retain the appropriate existing battle/site/town artwork or neutral fallback. Do not change terrain rules or manufacture naval encounters.')
save(D/'terrain-map.json',terrain)
icons={k:v for k,v in assets.items() if k.startswith(('icon.','frontendkit.icon.'))};save(D/'icon-map.json',dict(icons=icons,note='Reused original independent icon images, no screenshots. Plus/minus/arrows, sliders and state outlines use accessible HTML/CSS.'))
data=dict(assets=assets,themes=theme,creatures=creatures,biomes=terrain['scenes'],sampleNote='Presentation-only fixtures, never authoritative game state or quotes.')
(D/'data.js').write_text('window.KIT_DATA='+json.dumps(data,ensure_ascii=False)+';',encoding='utf8')
report=dict(status='passed',newAssets=len(new),runtimeFiles=len(files),runtimeMiB=round(sum(f['bytes'] for f in files.values())/1048576,1),icons=len(icons),creatureForms=len(creatures),factionForms=sum(c['pantheon'] in factions for c in creatures),heroes=len(hero['heroes']),sixScreensBySixPantheons=36,scope='Art, metadata and standalone preview only. Game code not changed.')
save(D/'asset-validation.json',report);print(json.dumps(report))
