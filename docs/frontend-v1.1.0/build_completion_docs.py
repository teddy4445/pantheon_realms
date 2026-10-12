from pathlib import Path
import json
R=Path('C:/Users/lazeb/Desktop/pantheon_realms');D=R/'docs/frontend-v1.1.0'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
recipes=read(D/'screen-recipes.json')
bindings=read(D/'element-bindings.json')['groups']
assets=read(R/'assets-runtime/frontend-kit-v1.1.0/complete-assets.json')['assets']
groups=[['main-menu'],['main-menu'],['setup-facts','pantheons'],['setup-facts'],['setup-facts','pantheons'],['pantheons','setup-facts'],['encyclopedia','creature-stats'],['creature-stats'],['settings'],['editor-toolbar'],['editor-toolbar'],['editor-toolbar','editor-tools'],[],[]]
deps=[[],[],['campaign.','mission.','emblem.'],['mission.','emblem.'],[],['god.','hero.','emblem.'],['creature.','god.','hero.','town.','icon.spell.','icon.skill.','icon.artifact.','icon.ability.'],['creature.','icon.ability.'],[],['mission.','emblem.'],[],['icon.world.','emblem.'],['emblem.'],[]]
notes=[
'Use separate background and logo. Real menu controls/icons. HTML assembly proof provided. No screenshot cropping.',
'Four independent mode paintings. Live title, descriptions, chevrons and route buttons. Main-menu logo may be omitted here.',
'Existing catalog campaign covers and mission pictures; blank open book, completed faction banners, live mission sequence and difficulty controls. Generic mockup illustrations are replaced by actual catalog art.',
'Catalog mission/scenario pictures, not invented screenshots; blank book/pages, live list and selection. Preserve actual navigation routes.',
'Nine exact-type paintings from random-map-types.json; live Land/Empires/Rules tabs and controls. Map routes/hex grids are actual renderer/CSS, not new painted overlays.',
'Six completed frontendkit.banner.* assets replace blank gui.banner.*. Names and selected checks remain live. Existing god/hero art fills real selections.',
'All 102 real creature forms and all existing category art. Square portraits replace generic wide concept pictures. Filters, search, tiers, tabs and costs are live.',
'Actual sprite animation strips and renderer replace the large mockup creature. Portrait pair comes from creature-art-map.json; stats and animation selectors remain live.',
'All seven category icons explicitly mapped. Real checkbox/range/select controls use scoped primitive styling; no fake controls extracted from screenshot.',
'Existing mission pictures identify context; do not pretend they are saved-game screenshots. Empty archive cutout supplied. Manual/auto/checkpoint labels and import/export/delete use existing data/actions.',
'Render previews from actual stored map documents, including the existing canvas and terrain renderer. Empty archive supplied. Keep local library semantics.',
'Live editor canvas supplies map and palette imagery. New tool icons and existing site/empires/check/map icons mapped. Grid, selection, terrain swatches, outlines are code, not missing raster art. No new mechanics.',
'Blank rank/laurel medallion with live rank number; local records and current faction emblems. No global leaderboard or invented data.',
'Separate warning wax seal, blank header, existing panel/button/surfaces. All dialog text stays live; use info icon for ordinary notices, warning for destructive intent.'
]
bom=[]
for i,r in enumerate(recipes):
 keys=set(r['newAssets']+r['sharedAssets'])
 if r['id']=='01':keys.discard('frontend.backdrop.title-hall')
 if r['id']=='06':keys={k for k in keys if not k.startswith('gui.banner.')}
 for g in groups[i]+['common']: keys.update(k for k in bindings[g].values() if not k.startswith('code.'))
 for prefix in deps[i]:keys.update(k for k in assets if k.startswith(prefix))
 missing=sorted(k for k in keys if k not in assets)
 bom.append(dict(id=r['id'],title=r['title'],concept=r['concept'],component=r['source'],assetIds=sorted(keys),bindingGroups=groups[i]+['common'],nativePrimitives=['live text','selection/focus/hover/disabled states','search-glyph.svg','frontend-primitives.css'],additionalDependency='creature-art-map.json animation strips' if r['id'] in ['07','08'] else None,constructionNote=notes[i],unresolved=missing))
save(D/'concept-bom.json',dict(note='Per-concept production bill of materials. Existing catalog images replace generic painted concept placeholders. No art should be cropped from concept screenshots.',screens=bom,unresolved=sorted({k for b in bom for k in b['unresolved']})))
assert not any(b['unresolved'] for b in bom)
# Make earlier entry points explicitly point at the complete kit.
p=D/'CLAUDE_CODE_HANDOFF_1.1.0_FRONTEND.txt';txt=p.read_text(encoding='utf8')
notice='ART COMPLETENESS UPDATE: Read UI-ART-COMPLETENESS.txt FIRST. The complete kit supplies the separate matching title background, new logo, six decorated banners, settings/editor/dialog icons, all creature art mappings and a complete copy helper. It supersedes the old logo/banner and optional dependency-copy instructions below.\nFull path: C:\\Users\\lazeb\\Desktop\\pantheon_realms\\docs\\frontend-v1.1.0\\UI-ART-COMPLETENESS.txt\n\n'
if not txt.startswith('ART COMPLETENESS UPDATE:'):p.write_text(notice+txt,encoding='utf8')
p=D/'index.html';txt=p.read_text(encoding='utf8')
if 'Complete construction kit' not in txt:txt=txt.replace('<nav>','<nav><a href="asset-kit.html">Complete construction kit</a><a href="UI-ART-COMPLETENESS.txt">Updated Claude handoff</a>',1);p.write_text(txt,encoding='utf8')
print('Built fourteen-screen BOM, no unresolved asset IDs.')
