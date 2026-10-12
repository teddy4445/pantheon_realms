from pathlib import Path
import json
R=Path('C:/Users/lazeb/Desktop/pantheon_realms'); S=R/'assets-source/frontend-kit-v1.1.0'; S.mkdir(exist_ok=True)
P=R/'assets-runtime/frontend-kit-v1.1.0';P.mkdir(exist_ok=True)
jobs=[]
def add(key,prompt,trans=True,refs=None):
    jobs.append(dict(key='frontendkit.'+key,file=key.replace('.','-')+'.png',destination=str(S/(key.replace('.','-')+'.png')),prompt=prompt,transparent=trans,refs=refs or []))
concept=str(R/'docs/frontend-v1.1.0/concepts/01-title-hall.png')
add('brand.logo','Use case: background-extraction. Reference is the Pantheon Realms title-screen concept. Create the ornate logo as ONE independent isolated production PNG, preserving its exact two-line wording PANTHEON / REALMS, antique gold serif lettering, dark blue enamel plaque, compass sun crest above and restrained gold flourishes. Exclude absolutely all scenery, buildings, interface buttons and menu. Wide 3:1 canvas, full logo centered with breathing space, genuinely transparent alpha outside its silhouette. Crisp readable lettering, no extra text. Match the reference logo closely.',True,[concept])
add('backdrop.title','Use case: precise-object-edit. Reference is title screen. Deliver ONLY its independent background painting, retain the same camera, six pantheon realms arranged three down left and three down right, arched mythic hall, sunset in center and stone floor. Remove the ENTIRE PANTHEON REALMS logo plaque/crest and ALL six menu buttons, their icons and their frame, seamlessly reconstruct sky/scenery/floor behind them. No text, no user interface, no floating symbols in center, no logo or menu residue. Landscape16:10. Preserve the beautiful composition. Central vertical strip reserved for live logo/menu must be calm.',False,[concept])
factions={'greek':('royal blue','gold lightning bolt inside laurel wreath'), 'norse':('deep burgundy','gold Thor hammer and restrained Nordic knotwork'),'egyptian':('black navy','gold ankh beneath ruby sun'),'japanese':('deep crimson','gold torii before rising sun'),'celtic':('forest green','gold triple spiral triskelion'),'mesoamerican':('deep teal','gold turquoise feathered serpent head')}
for f,(color,symbol) in factions.items():
    add('banner.'+f,f'Use case: stylized-concept. One independent completed {f} pantheon selection banner, for Gather the Empires UI. Reference supplies the actual faction emblem identity; reproduce its main {symbol} on this banner. Flat front-facing short vertical pennant, ratio2:3, pointed bottom, {color} cloth, thin antique gold trim, small top rail, no long poles. Large centered emblem in upper55 percent. Lower25 percent quiet blank cloth reserved for live faction label. Readable bold emblem and little fine decoration. Painted fantasy strategy UI, restrained bevel, same proportions across set. Full silhouette with8 percent transparent margin. Genuinely transparent background, no text or letters. Only ONE banner.',True,[str(R/f'assets-runtime/ui/icons/final/emblem.{f}.png')])
icons={
'interface':'a square framed interface panel with a broad horizontal heading bar and two smaller inset panes, representing interface layout',
'display':'a clear circular sun with eight short bold rays, representing display and brightness',
'audio':'one side-facing flared horn with two curved sound waves, representing sound volume',
'accessibility':'a simplified human figure with circular head, outstretched arms and separated legs, representing accessibility',
'controls':'a compact game controller silhouette with one cross-shaped directional pad and two round buttons, representing controls',
'bestiary':'a heraldic griffin head in profile with short feather crest and hooked beak, representing creature bestiary',
'select':'a simple large arrow-shaped mouse pointer angled toward upper left, representing selection',
'erase':'a clearly recognizable slanted rectangular eraser with one contrasting dark band',
'terrain':'three bold angular mountain peaks, the center peak taller, representing terrain',
'forest':'three stylized fir trees of staggered height, representing forest brush',
'water':'three bold horizontal curved wave bands, representing water brush',
'road':'a single winding S-shaped road with bold parallel edges and a few large paving blocks',
'hex':'one simple thick outlined hexagonal terrain tile, no inner detail',
'generate':'one six-sided gaming die seen on three faces with large black dot pips, representing random generation',
'new-map':'one partially unfurled blank parchment scroll with a small plus sign in lower right',
'import':'one bold DOWNWARD arrow entering an open document tray, representing importing a map or save',
'export':'one bold UPWARD arrow leaving an open document tray, representing exporting a map or save',
'delete':'a compact lidded waste bin with two broad vertical ribs, representing delete',
'undo':'one thick curved counterclockwise arrow pointing left, no enclosing circle',
'redo':'one thick curved clockwise arrow pointing right, no enclosing circle',
'artifacts':'one heavy gold ring with a large faceted sapphire gem, representing artifacts',
'warning':'one round red wax seal with a thin gold rim and large raised gold EXCLAMATION MARK at center, representing discard-changes warning',
'records':'one round antique gold achievement medallion in a modest laurel wreath, center blank for a LIVE rank number',
}
for name,subject in icons.items():
    add('icon.'+name,'Use case: stylized-concept. Production fantasy strategy UI ICON. '+subject+'. ONE isolated centered icon, front-facing simplified sculpted silhouette, warm antique gold face, subtle dark bronze bevel shadow, cream edge highlights, strong broad forms legible at32px. Harmonizes with Pantheon Realms navy and gold classic game UI. Square canvas, icon occupies80 percent with transparent padding. Genuinely transparent background, no plaque or surrounding frame unless explicitly part of subject, no background glow, no scenery, no text, no extra symbols. Crisp clean edges. Avoid fine filigree and realism.')
add('chrome.header','Use case: stylized-concept. ONE blank wide rectangular dark navy carved-stone title bar for fantasy strategy UI. Thin gold straight border, modest gold corner brackets, quiet dark center75 percent reserved for live title text. No icon, no lettering, no faction symbols. Front-facing flat, ratio3:1, generous transparent exterior. Genuinely transparent background. Design edge geometry so left/right endcaps can remain fixed while center stretches horizontally. Match Pantheon Realms gold navy UI.')
add('chrome.round-socket','Use case: stylized-concept. ONE empty round icon socket: thin antique gold double ring with restrained bronze bevel, navy enamel disk inside; centered perfectly circular, front facing, no symbols or lettering. Fantasy game UI. Square canvas ring fills80percent leaving transparent outer margin. Genuinely transparent outside circle; interior opaque navy. Bold clean consistent outline readable at48px.')
(S/'generation-queue.json').write_text(json.dumps(jobs,indent=2),encoding='utf8')
print(len(jobs))
