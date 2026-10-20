"""Round 4 studies: intervention price mix, creator fee sensitivity, behavioural demand, launch-week cold start.
Uses econ.run (same payout rules as economy.js). Lineage outcomes: long measured worlds if available (lineages_long.json)."""
import json, os, numpy as np, econ
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
if os.path.exists('lineages_long.json'):
    L=json.load(open('lineages_long.json')); W=econ.WEIGHT
    econ.CAS=[W(x) for x in L['casual']]; econ.STR=[W(x) for x in L['starter']]; econ.SKL=[W(x) for x in L['skilled']]
SRC='long' if os.path.exists('lineages_long.json') else 'short'
# Intervention prices from server.js at an assumed SOL price of $150: food 0.01, meteor 0.05, cold 0.03, toxic 0.03 SOL.
PX={'food':1.5,'meteor':7.5,'cold':4.5,'toxic':4.5}; MIX={'food':.6,'meteor':.1,'cold':.15,'toxic':.15}  # mix is an assumption
CAP={'meteor':288,'cold':480,'toxic':480}  # cooldowns 5 / 3 / 3 minutes
def interventions(n):
    tot=0;cnt=0
    for k,m in MIX.items():
        c=n*m
        if k in CAP: c=min(c,CAP[k])
        tot+=c*PX[k];cnt+=c
    return cnt, tot/cnt
out={'source':SRC,'mix':MIX,'prices_usd':PX}
def S(*a,**k):
    h,pr,pl,b=econ.run(*a,**k); s=econ.summarize(pr,pl); s['burn_day']=float(np.mean(b[3:])); s['pool_end']=h[-1]['bal']; s['price_end']=h[-1]['price']; return s,h
# 1. intervention mix
res=[]
for n in [50,200,1000]:
    c,px=interventions(n); s,_=S(100e3,0.003,c,px,50); res.append(dict(n=n,counted=c,avg_px=px,**{k:s[k] for k in ['avg_roi','p50','p90','pct_profit','players_profit','burn_day']}))
out['intervention_mix']=res
# 2. creator fee sensitivity (rates from pump.fun fee page, 17 Oct 2026)
res=[]
for fee in [0.0005,0.003,0.0075,0.0095]:
    for vol in [20e3,100e3,500e3]:
        c,px=interventions(200); s,h=S(vol,fee,c,px,50); res.append(dict(fee=fee,vol=vol,inflow=h[-1]['inflow'],capacity=int(h[-1]['inflow']*0.9/1.2),**{k:s[k] for k in ['avg_roi','p50','pct_profit','price_end','burn_day']}))
out['fee_sensitivity']=res
# 3. behavioural demand: tomorrow's releases = today's x clip((yesterday avg return)^1.5, 0.7, 1.3); the site shows yesterday's return
def dem(r0):
    st={'r':r0,'path':[]}
    def f(d,yavg,price):
        if yavg is not None: st['r']=max(3,st['r']*min(1.3,max(0.7,yavg**1.5)))
        st['path'].append(st['r']);return st['r']
    return f,st
res=[];fig,ax=plt.subplots(1,2,figsize=(11,4.5))
for (vol,fee,n),col in zip([(20e3,0.003,50),(100e3,0.003,200),(500e3,0.003,1000)],['#999','#c2502a','#111']):
    c,px=interventions(n)
    for r0 in [10,300]:
        f,st=dem(r0); h,pr,pl,b=econ.run(vol,fee,c,px,r0,days=60,demand=f)
        tail=h[-14:]; res.append(dict(vol=vol,fee=fee,n_int=n,start=r0,eq_releases=float(np.mean([x['paid'] for x in tail])),eq_return=float(np.mean([x['yavg'] for x in tail if x['yavg']])),eq_price=float(np.mean([x['price'] for x in tail]))))
        ax[0].plot([x['paid'] for x in h],color=col,ls='-' if r0==10 else '--'); ax[1].plot([x['yavg'] for x in h],color=col,ls='-' if r0==10 else '--',label=f'vol ${vol/1e3:.0f}k, {n} interventions, start {r0}/day')
ax[0].set_title('Paid releases per day when players react'); ax[0].set_xlabel('day'); ax[0].set_yscale('log')
ax[1].set_title('Average return shown as yesterday avg'); ax[1].set_xlabel('day'); ax[1].axhline(1,color='k',lw=.5); ax[1].legend(fontsize=7)
fig.tight_layout(); fig.savefig('behaviour_equilibrium.png',dpi=130); out['behaviour']=res
# 4. launch-week cold start: pool starts at 0, volume ramps from $5k to $100k over 14 days, 20 releases/day, 50 interventions/day
ramp=lambda d: 5e3*(20**min(1,d/14))
res=[];fig,ax=plt.subplots(figsize=(8,4.5))
for name,kw,col in [('no bootstrap',{},'#999'),('seed pool $300',{'seed_pool':300},'#111'),('100% creator fee to pool for 7 days',{'boost_days':7,'boost_share':1.0},'#c2502a'),('both',{'seed_pool':300,'boost_days':7,'boost_share':1.0},'#7a3b1e')]:
    c,px=interventions(50); h,pr,pl,b=econ.run(5e3,0.003,c,px,20,days=21,vol_fn=ramp,price0=5.0,**kw)
    wk=[r for r in pr if r[1] and r[4]<7]; roi=sum(r[3] for r in wk)/sum(r[2] for r in wk); med=float(np.median([r[3]/r[2] for r in wk]))
    day0=[r for r in pr if r[1] and r[4]==0]; r0=sum(r[3] for r in day0)/sum(r[2] for r in day0)
    res.append(dict(name=name,week1_avg=roi,week1_median=med,day0_avg=r0,seed_cost=kw.get('seed_pool',0)))
    ax.plot([x['yavg'] for x in h],color=col,label=name)
ax.axhline(1,color='k',lw=.5); ax.set_xlabel('day after launch'); ax.set_ylabel('average return of paid releases'); ax.set_title('Launch weeks: pool starts empty, volume ramps $5k to $100k'); ax.legend(fontsize=8)
fig.tight_layout(); fig.savefig('cold_start.png',dpi=130); out['cold_start']=res
json.dump(out,open('round4.json','w'),indent=1); print(json.dumps(out,indent=1))
