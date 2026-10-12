import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
docs = Path(__file__).resolve().parent
assets = json.loads((root/'assets-runtime/adventure-gui-v1.1.0/complete-assets.json').read_text(encoding='utf-8'))['assets']
themes = json.loads((docs/'theme-map.json').read_text(encoding='utf-8'))

def asset_role(label, ids, layout, source=None):
    missing = [key for key in ids if key not in assets]
    assert not missing, missing
    return dict(element=label, assetIds=ids, runtimeFiles=[assets[key]['file'] for key in ids], layout=layout, dataSource=source)

rows = []
for role, label in [('frame','Decorative screen border'),('emblem','Pantheon crest'),('banner','Pantheon banner'),('tavern','Empty tavern interior'),('recruitment','Empty recruitment courtyard'),('market','Merchant backdrop'),('levelup','Level-up camp backdrop'),('spellbook','Blank spellbook')]:
    ids = list(dict.fromkeys(t[role] for t in themes.values()))
    rows.append(asset_role(label,ids,'Independent decorative image. Resolve faction using theme-map.json; keep live content above the frame.','Town archetype for town screens; actual hero pantheon for hero screens.'))
rows += [
    asset_role('Skill offer card',['adventurekit.chrome.skill-card'],'Alpha image below a live button. Icon in the upper medallion; live offer text in normalized safe rectangle [0.12,0.54,0.88,0.86]. Reflow long localized descriptions rather than clip.','Actual pending decision offers; catalog.skills iconAssetId and descriptions.'),
    asset_role('Hero portrait medallion',['adventurekit.chrome.hero-medallion'],'Circular cropped same-hero portrait under the alpha opening; live hero name on lower plate.','hero-art-map.json, then current hero definition.'),
    asset_role('Marketplace balance ornament',['adventurekit.chrome.balance'],'Transparent decorative image between live give/receive panels. Hide from screen readers.'),
    asset_role('Panel surfaces',['gui.surface.parchment','gui.surface.leather','gui.surface.stone'],'Independent texture under native layout. Do not stretch text or crop texture from concepts.'),
    asset_role('Painted button and army socket',['gui.control.button','gui.control.socket'],'Optional independent art under semantic buttons/slots; CSS borders in preview are also supplied. Keep at least 44px target.'),
    asset_role('Encounter scenery',[k for k in assets if k.startswith('adventurekit.encounter.')],'Cover stage with biome selected from destination terrain/climate. Preserve special water/siege fallbacks.','terrain-map.json'),
    asset_role('Common stat and resource icons',[k for k in assets if k.startswith('icon.stat.') or k.startswith('icon.res.')],'Contain icon at readable size with live number and accessible label. No baked values.','Current hero stats, wallet, quote objects.'),
    asset_role('Screen action icons',['icon.ui.tavern','icon.ui.recruit','icon.ui.upgrade','icon.ui.swap','icon.ui.sword2','icon.action.retreat','icon.ui.check','icon.ui.auto'],'Independent icon beside live label. Preserve actual command disabled reason.','screen-bindings.json'),
]
rows += [
    dict(element='Hero foreground and portrait', mapping='hero-art-map.json', layout='Use exact candidate/hero ID; prefer supplied same-hero bust, otherwise same-hero portrait panel. Never use another hero as a substitute.'),
    dict(element='Creature portrait and animated detail', mapping='creature-art-map.json', layout='Choose exact creatureId and base/upgraded form. Portrait is immediately usable; optional animation uses provided frame count, dimensions, fps, anchor and loop metadata.'),
    dict(element='Ability, spell, skill and gift icons', mapping='icon-map.json and complete-assets.json', layout='Resolve catalog iconAssetId. Use actual known spells/offered skills/abilities; no screenshot extraction. Existing god art can illustrate a gift.'),
    dict(element='Dynamic controls and text', implementation='components.css and preview.js', controls=['tabs','resource mode selector','destination selector','tier selector','quantity slider and number input','army count labels','tooltips','close/back buttons','confirmation actions','scrollable spell list'], states=['normal','hover','focus-visible','selected','disabled','empty','loading','error'], layout='Use semantic native controls with live localized labels. Extend the existing game controls, not the preview fixture state. No generated bitmap required for these elements.'),
]
(docs/'element-bindings.json').write_text(json.dumps(dict(status='ready',scope='Production layers for six adventure screens across six pantheons',runtimeRoot='assets-runtime/',elements=rows,implementationNotes=['No text, prices, commands or tooltips baked into new images.','Keep border below content and pointer-events:none.','On narrow layouts stack panels, allow scroll, and replace two-page book with parchment panels.','Read CLAUDE_HANDOFF.txt before integrating; it preserves current command semantics.']),indent=2),encoding='utf-8')
assert all((root/'assets-runtime'/a['file']).is_file() for a in assets.values())
for screen, binding in json.loads((docs/'screen-bindings.json').read_text(encoding='utf-8')).items():
    icons = binding.get('icons', [])
    if isinstance(icons,list):
        assert all(k in assets for k in icons), screen
print(json.dumps({'elementRoles':len(rows),'allReferencedFilesExist':True,'screenIconIdsValid':True}))
