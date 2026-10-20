# Territory (PvP) effect on payouts: zones held measured in sim.js with pvp active (pvp31..34.json).
import json,glob,numpy as np,econ
rows=[]
for f in sorted(glob.glob('pvp3*.json')):
    for r in json.load(open(f))['rel']:
        life=len(r['traj'])*10; cs=sum(r['traj'])*10; zs=sum(r.get('zt') or [])*10
        if cs>0: rows.append((r['ty'],cs,zs/life))
cs=np.array([x[1] for x in rows]); z=np.array([x[2] for x in rows])
a,b=np.polyfit(np.log(cs),z,1)
fit=lambda c: max(0.0,min(3.0,a*np.log(max(c,1))+b))
def mult(c,bonus=0.05): return 1+bonus*fit(c)
out={'n':len(rows),'mean_zones':float(z.mean()),'p90_zones':float(np.percentile(z,90)),'max_zones':float(z.max()),'fit':[float(a),float(b)],
     'by_type':{t:float(np.mean([x[2] for x in rows if x[0]==t])) for t in ['casual','starter','skilled']}}
base=dict(econ.PARAMS)
res={}
for bonus in [0.0,0.05,0.10]:
    C0,S0,T0=econ.CAS,econ.SKL,econ.STR
    inv=lambda w:(w**(1/0.6))
    econ.CAS=[w*mult(inv(w),bonus) for w in C0];econ.SKL=[w*mult(inv(w),bonus) for w in S0];econ.STR=[w*mult(inv(w),bonus) for w in T0]
    s=econ.summarize(*econ.run(100e3,0.003,200,2.0,50)[1:3]);res[str(bonus)]={k:round(float(v),3) for k,v in s.items()}
    econ.CAS,econ.SKL,econ.STR=C0,S0,T0
out['effect']=res;json.dump(out,open('zones.json','w'),indent=1);print(json.dumps(out,indent=1))
