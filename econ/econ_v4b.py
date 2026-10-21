"""Large-sample v4 economy: lineage creature-seconds from r_big_* (shipped v4) and r_cap100_* (candidate), plus retune grid.
Usage: python3 econ_v4b.py <glob> ..."""
import json, glob, sys, copy, numpy as np, econ
from econ2 import S, interventions
def load(pat):
    cs=[];life=[]
    for f in sorted(glob.glob(pat)):
        d=json.loads(open(f).read().strip().split('\n')[-1]); cs+=[x['cs'] for x in d['life']]; life+=[x['life'] for x in d['life']]
    return cs,life
c,px=interventions(200); out={}
for pat in sys.argv[1:]:
    cs,life=load(pat); L=np.array(life)
    base=dict(n=len(cs),life_med_min=float(np.median(L)),life_p10=float(np.percentile(L,10)),life_p90=float(np.percentile(L,90)))
    res=[]
    for expo in [0.6,0.8,1.0]:
        for tr in [0.9,1.0,1.1,1.2]:
            econ.WEIGHT=lambda x,e=expo:x**e; W=econ.WEIGHT; econ.CAS=econ.STR=econ.SKL=[W(x) for x in cs]
            P=copy.deepcopy(econ.PARAMS); P['target_roi']=tr
            s,_=S(100e3,0.003,c,px,50,P=P); res.append(dict(expo=expo,target=tr,**{k:round(float(s[k]),3) for k in ['avg_roi','p50','p90','pct_profit']}))
    out[pat]=dict(life=base,grid=res)
json.dump(out,open('econ_v4b.json','w'),indent=1); print(json.dumps(out,indent=1))
