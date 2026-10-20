"""v4 survival rule: rerun the medium game with lineage outcomes measured under the 6 h metabolic fade (lineages_v4.json) vs round 4 long worlds."""
import json, numpy as np, econ
from econ2 import S, interventions
c,px=interventions(200); out={}
s,_=S(100e3,0.003,c,px,50); out['before']={k:s[k] for k in ['avg_roi','p50','p90','pct_profit']}
V=json.load(open('lineages_v4.json'))['cs']; W=econ.WEIGHT; econ.CAS=econ.STR=econ.SKL=[W(x) for x in V]
s,_=S(100e3,0.003,c,px,50); out['v4']={k:s[k] for k in ['avg_roi','p50','p90','pct_profit']}
json.dump(out,open('econ_v4.json','w'),indent=1); print(json.dumps(out,indent=1))
