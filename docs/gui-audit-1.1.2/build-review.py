from pathlib import Path
import json,csv,html,shutil,datetime
R=Path('C:/Users/lazeb/Desktop/pantheon_realms'); D=R/'docs/gui-audit-1.1.2'
def read(p,default):
 try:return json.loads(p.read_text(encoding='utf-8-sig'))
 except FileNotFoundError:return default
def specs(r):
 out=[]
 def walk(s):
  for sp in s.get('specs',[]):
   for t in sp['tests']:
    out.append({'title':sp['title'],'file':sp.get('file'),'line':sp.get('line'),'status':t['status'],'results':[{'status':x['status'],'duration':x['duration'],'error':x.get('error',{}).get('message','')} for x in t['results']]})
  for s in s.get('suites',[]):walk(s)
 walk(r);return out
initial=read(D/'test-report.json',{});rerun=read(D/'test-rerun-report.json',{})
first=specs(initial);second=specs(rerun);combined={x['title']:x for x in first};combined.update({x['title']:x for x in second})
tests=list(combined.values());(D/'test-summary.json').write_text(json.dumps({'firstRun':first,'rerun':second,'latestPerTest':tests},indent=2),encoding='utf-8')
cat=read(D/'catalog.json',[])
old=read(R/'docs/gui-review-2026-10-10/catalog.json',[])
if not old:old=read(Path('C:/Users/lazeb/Desktop/blannder_models/gui-review-2026-10-10/catalog.json'),[])
current={x['id']:x for x in cat};allrows={x['id']:x for x in old};allrows.update(current)
with (D/'coverage.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f);w.writerow(['ID','Name','Current screenshot','Coverage','Source'])
 for id,x in sorted(allrows.items()):w.writerow([id,x['name'],x.get('screenshot','') if id in current else '', 'Current staged screenshot; see separate functional results' if id in current else 'Not captured in this audit; not a confirmed defect',x.get('source','')])
counts={s:sum(x['status']==s for x in tests) for s in ['expected','unexpected','skipped','flaky']}
results={'version':'1.1.2','date':'2026-10-11','commit':'87456807228fb0072777cb09e1d586f85a797ffc','environment':'Fresh local source on Vite 5196, isolated Chrome with SwiftShader. Installed Electron and release build not audited.','currentCatalogScreens':len(cat),'previousInventoryStates':len(old),'notCaptured':[{'id':id,'name':x['name']} for id,x in allrows.items() if id not in current], 'firstRunStats':initial.get('stats'), 'rerunStats':rerun.get('stats'),'latestPerTestCounts':counts,'implementationChangesApplied':False,'newArt':{'selectedAtlases':6,'stateMappings':18,'runtime':'assets-runtime/siege-gates-v3/manifest.json'},'findings':['Siege gate orientation/registration requires replacement and final join verification','Start Battle painted face clips icon/label stack','Campaign Difficulty label has low contrast on parchment','Journal needs readable fallback while book image loads; fully decoded layout is correct','Town renders an internal placeholder-art caption','Battle controls become interactive before critical textures appear under cold load'],'limitations':['Screenshots stage representative states; they are not full campaign playthroughs.','Not every possible hero, screen state, faction combination or accessibility setting was visually inspected.','See test-summary.json for unresolved failures and skipped tests.','Gate prototype changes are isolated to a browser response and staged HP; production source is unchanged.']}
(D/'audit-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
# Preserve fresh suite screenshots without mixing in old-version screenshots.
cut=datetime.datetime.fromisoformat(initial['stats']['startTime'].replace('Z','+00:00')).timestamp() if initial else 0
for p in (R/'test-results').rglob('*.png'):
 if p.stat().st_mtime>=cut:
  target=D/'functional-screenshots'/p.relative_to(R/'test-results');target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
e=html.escape
css='''body{margin:0;background:#0c1622;color:#e6dcc3;font:16px/1.55 system-ui}header,main{max-width:1450px;margin:auto;padding:28px}h1,h2{font-family:Georgia;color:#efcd7b}a{color:#b4dcec}nav{display:flex;gap:20px;flex-wrap:wrap}.cards,.gates{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:20px}article,section.note{background:#142233;border:1px solid #526077;border-radius:8px;padding:18px;margin:15px 0}img{width:100%;height:auto;display:block}article h3{margin:8px 0}small{color:#b4bfcf}.gate{background:repeating-conic-gradient(#c7c7c7 0% 25%,#f5f5f5 0% 50%) 50%/24px 24px}.badge{color:#f4c775}input{padding:12px;width:min(95%,600px);background:#f6ecd8;color:#172132;border-radius:5px}summary{cursor:pointer;font-weight:bold}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:8px;border-bottom:1px solid #3c4b5d}.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:650px){.pair{grid-template-columns:1fr}}'''
parts=[f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pantheon Realms 1.1.2 review</title><style>{css}</style><header><h1>Pantheon Realms · GUI & siege review</h1><p>Latest local source 1.1.2 · 11 October 2026 · prepared for Claude Code</p><nav><a href="CLAUDE_HANDOFF.txt">Claude implementation handoff</a><a href="#findings">Fixes</a><a href="#gates">Six gate sets</a><a href="#screens">Screen gallery</a><a href="#tests">Tests and limits</a><a href="coverage.csv">Coverage CSV</a></nav></header><main>']
parts.append(f'<section class="note"><b>{len(cat)} named current screen states captured.</b> Latest functional outcomes: {counts["expected"]} passed, {counts["unexpected"]} unresolved, {counts["skipped"]} skipped. Screenshots include staged states. This is a review and materials delivery; the production game has not been modified.</section>')
parts.append('<h2 id="findings">Concrete fixes</h2>')
for title,description,img in [
 ('Gate faces the wrong direction','Replace the broad gatehouse with the new west-facing gate and align it with the road and vertical wall. Keep adjacent destroyed wall sections visually clear.','siege-after-greek.png'),
 ('Start Battle button','The vertical icon/text stack extends below the painted face. Adjust the layout and hit area together.','siege-after-greek.png'),
 ('Parchment label contrast','Difficulty uses pale gold on pale parchment. Use the parchment ink token in this context.','screenshots/S03A.png'),
 ('Battle loading readiness','Commands and targeting can appear before the units and battlefield textures. Show loading or readable placeholders until the critical art is ready.','screenshots/battle-cold-load.png'),
 ('Internal town caption','Remove the placeholder-art caption from the finished town.','screenshots/T01.png')]:
 parts.append(f'<details><summary>{e(title)}</summary><p>{e(description)}</p><a href="{img}"><img width="1600" height="1000" loading="lazy" src="{img}" alt="{e(title)}"></a></details>')
parts.append('<details><summary>Journal: loading fallback, not a broken finished layout</summary><p>The initial capture exposes dark text on the dark scene. After explicitly decoding the existing artwork, the two-page book is correct. Preload the critical skin and provide a readable fallback.</p><div class="pair"><figure><img src="screenshots/journal-confirmed.png" loading="lazy"><figcaption>Cold/loading state</figcaption></figure><figure><img src="screenshots/journal-decoded.png" loading="lazy"><figcaption>Existing artwork fully decoded</figcaption></figure></div></details>')
parts.append('<h2 id="gates">Six native gate atlases · 18 states</h2><p>Intact, damaged, breached from left to right. Checkerboard is this viewer only. Native PNG alpha is preserved. The manifest supplies frame rectangles and per-state anchors. Source prompts and provenance are in the source pack.</p><p><a href="../../assets-runtime/siege-gates-v3/manifest.json">Runtime manifest</a> · <a href="gate-validation.json">Dimensions, alpha and hashes</a></p><div class="gates">')
for id in ['greek','norse','egyptian','japanese','celtic','mesoamerican']:
 src=f'../../assets-runtime/siege-gates-v3/gate.{id}-v5.png'
 parts.append(f'<article><h3>{id.title()}</h3><a href="{src}"><img width="1536" height="1024" class="gate" src="{src}" loading="lazy" alt="{id} three-state gate atlas"></a>')
 for suffix,label in [('', 'Isolated browser prototype'),('-damaged','Damaged prototype'),('-rubble','Breached prototype')]:
  file=f'siege-prototype-{id}{suffix}.png'
  if (D/file).exists():parts.append(f'<p><a href="{file}">{label}</a></p>')
 parts.append('</article>')
parts.append('</div><h2 id="screens">Current screen gallery</h2><p>Representative captured states, with where each appears and what it contains. Empty or disabled controls can reflect valid game rules. Search by screen name or ID.</p><input id="search" type="search" placeholder="Search screens…" aria-label="Search screens"><div class="cards">')
for x in sorted(cat,key=lambda x:x['id']):
 parts.append(f'<article class="screen" data-search="{e((x["id"]+" "+x["name"]).lower())}"><h3>{e(x["id"])} · {e(x["name"])}</h3><a href="{e(x["screenshot"])}"><img width="1600" height="1000" loading="lazy" src="{e(x["screenshot"])}" alt="{e(x["name"])}"></a><p>{e(x["when"])} {e(x["includes"])}</p><small>{e(x.get("source",""))}</small></article>')
parts.append('</div><h2 id="tests">Functional checks and limits</h2><p><a href="test-summary.json">Exact initial and rerun results</a> · <a href="audit-results.json">Audit scope</a> · <a href="coverage.csv">Screen coverage and gaps</a></p><table><thead><tr><th>Test</th><th>Latest status</th></tr></thead><tbody>')
for x in tests:parts.append(f'<tr><td>{e(x["title"])}</td><td>{e({"expected":"Passed","unexpected":"Unresolved","skipped":"Skipped","flaky":"Flaky"}.get(x["status"],x["status"]))}</td></tr>')
parts.append('</tbody></table><p>Browser source audit only. Validate packaged Electron, offline loading and a production build under a nested base before release. The DPI test is not a substitute for actual browser text zoom. Old-save compatibility has an explicitly skipped fixture check.</p></main><script>document.querySelector("#search").addEventListener("input",e=>document.querySelectorAll(".screen").forEach(x=>x.hidden=!x.dataset.search.includes(e.target.value.toLowerCase())));</script></html>')
(D/'index.html').write_text(''.join(parts),encoding='utf-8')
print(json.dumps({'screens':len(cat),'tests':counts,'missing':results['notCaptured']},indent=2))
