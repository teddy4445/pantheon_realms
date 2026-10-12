from pathlib import Path
import re
D=Path(__file__).parent
p=D/'build.py';p.write_text(p.read_text(encoding='utf-8-sig').replace('icon.ui.retreat','icon.action.retreat'),encoding='utf8')
p=D/'preview.js';s=p.read_text(encoding='utf-8-sig');s=re.sub(r'<details class="gift-sample">.*?</details>','',s);s=s.replace('The game’s calculated outcome and losses appear here.','Review the expected outcome and troop losses before choosing quick battle.');p.write_text(s,encoding='utf8')
