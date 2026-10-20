import json, itertools, numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from econ import run, summarize, PARAMS
rows=[]
for vol,fee,ni,nr in itertools.product([20e3,100e3,500e3],[0.0005,0.003],[50,200,1000],[10,50,300]):
    h,pr,pl,b=run(vol,fee,ni,2.0,nr)
    s=summarize(pr,pl); inflow=h[-1]['inflow']
    s.update(vol=vol,fee=fee,interventions=ni,releases=nr,inflow_day=inflow,price_end=h[-1]['price'],pool_end=h[-1]['bal'],
             pool_min_after_wk=min(x['bal'] for x in h[7:]),soup_burn_day=float(np.mean(b[7:])),
             eq_releases_at_floor=int(inflow*0.9/(1.2*PARAMS['p_min'])))
    rows.append(s)
json.dump(rows,open('scenarios.json','w'),indent=1)
# exploits
ex={}
base=(100e3,0.003,200,2.0,50)
for syb in [0,100,1000]:
    h,pr,pl,_=run(*base,sybil=syb); s=summarize(pr,pl)
    sy=[v for k,v in pl.items() if k.startswith('syb')]; ex[f'sybil_{syb}']=dict(honest_avg_roi=s['avg_roi'],sybil_take_per_day=(sum(v[2] for v in sy)/30 if sy else 0))
for wm in [1,10,50]:
    h,pr,pl,_=run(*base,whale_mult=wm); s=summarize(pr,pl); ex[f'whale_x{wm}']=dict(whale_roi=s['whale'],others_avg=s['casual'],skilled=s['skilled'])
P2=dict(PARAMS,wallet_cap=1.0,free_weight=1.0,free_cap=1.0)
for wm in [50]:
    h,pr,pl,_=run(*base,whale_mult=wm,P=P2); s=summarize(pr,pl); ex[f'whale_x{wm}_nocaps']=dict(whale_roi=s['whale'],casual=s['casual'])
h,pr,pl,_=run(*base,sybil=1000,P=P2); s=summarize(pr,pl); sy=[v for k,v in pl.items() if k.startswith('syb')]
ex['sybil_1000_nocaps']=dict(honest_avg_roi=s['avg_roi'],sybil_take_per_day=sum(v[2] for v in sy)/30)
json.dump(ex,open('exploits.json','w'),indent=1)
# charts
fig,ax=plt.subplots(figsize=(8,5))
for vol,fee,c in [(20e3,0.0005,'#999'),(100e3,0.003,'#c2502a'),(500e3,0.003,'#111')]:
    xs=[5,10,25,50,100,200,300,600,1000]; ys=[summarize(*run(vol,fee,200,2.0,n)[1:3])['avg_roi'] for n in xs]
    ax.plot(xs,ys,'o-',color=c,label=f'vol ${vol/1e3:.0f}k, fee {fee*100:.2f}%, 200 interventions')
ax.axhspan(1.2,1.5,color='#c2502a',alpha=.1,label='target about 1.2x'); ax.axhline(1,color='k',lw=.5)
ax.set_xscale('log'); ax.set_xlabel('paid releases per day'); ax.set_ylabel('average return per $1 burned'); ax.legend(fontsize=8); ax.set_title('Average return vs releases per day (price floor $1)')
fig.tight_layout(); fig.savefig('roi_vs_releases.png',dpi=130)
fig,ax=plt.subplots(figsize=(8,5))
for (vol,fee,ni,nr),c in zip([(20e3,0.0005,50,10),(100e3,0.003,200,50),(500e3,0.003,1000,300)],['#999','#c2502a','#111']):
    h=run(vol,fee,ni,2.0,nr)[0]; ax.plot([x['bal'] for x in h],color=c,label=f'low/mid/high: vol ${vol/1e3:.0f}k, {ni} int, {nr} rel')
ax.set_xlabel('day'); ax.set_ylabel('pool balance after payouts (USD)'); ax.legend(fontsize=8); ax.set_title('Prize pool balance over 30 days')
fig.tight_layout(); fig.savefig('pool_balance_30d.png',dpi=130)
