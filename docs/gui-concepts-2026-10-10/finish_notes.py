from pathlib import Path
import json
root=Path(__file__).parent
items=json.loads((root/'concepts.json').read_text('utf8'))
text=(root/'notes-introduction.txt').read_text('utf8')
for c in items:
 text+='\n'+c['id']+' — '+c['title']+'\n'
 text+='Final image: '+str(root/c['file'])+'\n'
 text+='Baseline IDs: '+(', '.join(c['catalog']) or 'Shared visual system')+'\n'
 text+='Design intent: '+c['summary']+'\n'
 text+='Behavior: '+c['behavior']+'\n'
 for p in c['codeFiles']:text+='Current code: '+p+'\n'
 text+='\n'
text+='PROMPTS AND TOOL\nBuilt-in image_gen was used for all images and all corrections.\nFull initial prompts: '+str(root/'generation-prompts.json')+'\nCorrection prompts: '+str(root/'revision-prompts.json')+'\n'
(root/'DESIGN_NOTES_FOR_CLAUDE.txt').write_text(text,'utf8')
(root/'README.txt').write_text('PANTHEON REALMS — 14 GUI CONCEPTS\n\nOpen index.html in a browser. Choose a concept, then Proposed design, Current game or Side by side. Click an image to enlarge.\n\nRead DESIGN_NOTES_FOR_CLAUDE.txt for intended behavior, implementation boundaries and source locations. These are review concepts, not implemented screens or final sliced UI assets.\n\nKeep this folder together: the gallery uses relative image paths and works offline. Corrected final variants are selected automatically by the gallery and concepts.json. Earlier variants are retained for traceability.\n\nAll 14 selected images are native 1586 x 992 PNGs. Generated with built-in image_gen. No code retouching or upscaling.\n','utf8')
print('Design notes and README ready')
