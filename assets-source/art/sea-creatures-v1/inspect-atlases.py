from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label,find_objects
import json
root=Path(__file__).resolve().parent
reports={}
for p in sorted((root/'assets/animations').glob('*.png')):
    a=np.asarray(Image.open(p))[:,:,3]
    labels,n=label(a>32)
    counts=np.bincount(labels.ravel()); big=np.where(counts>800)[0];big=big[big!=0]
    slices=find_objects(labels)
    objs=[]
    for i in big:
        y,x=slices[i-1];objs.append([x.start,y.start,x.stop-x.start,y.stop-y.start,int(counts[i])])
    reports[p.stem]={'size':[a.shape[1],a.shape[0]],'largeComponents':len(objs),'boxes':sorted(objs,key=lambda b:(round((b[1]+b[3]/2)/(a.shape[0]/(2 if p.stem.startswith('fx-') else 4))),b[0])),'transparentFraction':round(float((a==0).mean()),3)}
    print(p.stem, len(objs),'edge pixels',int((a[0,:]>32).sum()+(a[-1,:]>32).sum()+(a[:,0]>32).sum()+(a[:,-1]>32).sum()))
(root/'design/alpha-components.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
