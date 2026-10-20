"""Primordial economic simulator. Lineage outcomes are bootstrapped from real sim.js runs (lineages.json, made by measure.js + build step).
All money in USD. Assumptions are labeled in REPORT.md."""
import json, random, statistics as st, itertools, sys
import numpy as np
L=json.load(open('lineages.json'))
WEIGHT=lambda x:x**0.6  # recommended: power 0.6 of creature-seconds (diminishing returns)
CAS=[WEIGHT(x['integ']) for x in L['C']]; SKL=[WEIGHT(x['integ']) for x in L['S']]; STR=[WEIGHT(x['integ']) for x in L.get('T',L['C'])]
PARAMS=dict(creator_to_pool=0.7, interv_to_pool=0.4, yield_share=0.85, bonus_split=(.5,.3,.2),
            payout_rate=0.5,     # fraction of pool balance paid out per day (spread hourly)
            target_roi=1.2, p_min=1.0, p_max=25.0, free_weight=0.25, free_cap=0.10, wallet_cap=0.10,
            max_paid_per_wallet=10)
def run(vol,fee,n_int,int_px,base_rel,days=30,mix=(.2,.4,.3,.1),free_per_day=None,sybil=0,whale_mult=1,P=PARAMS,seed=0,demand=None,vol_fn=None,seed_pool=0.0,boost_days=0,boost_share=1.0,price0=5.0):
    rnd=random.Random(seed); bal=float(seed_pool); price=price0; yavg=None; hist=[]; per_rel=[]; players={}
    free_per_day = int(base_rel*0.5) if free_per_day is None else free_per_day
    burned=[]
    for d in range(days):
        v=vol_fn(d) if vol_fn else vol; cshare=boost_share if d<boost_days else P['creator_to_pool']
        inflow=v*fee*cshare+n_int*int_px*P['interv_to_pool']
        buyback=n_int*int_px*(1-P['interv_to_pool'])
        bal+=inflow; out=bal*P['payout_rate']; bal-=out
        y_budget=out*P['yield_share']; b_budget=out-y_budget
        # demand responds to expected ROI (players see a published price & last-day ROI)
        n_paid=max(1,int(round(demand(d,yavg,price) if demand else base_rel)))
        ents=[]  # (wallet, type, paid, weight)
        for i in range(n_paid):
            t=rnd.choices(['casual','starter','skilled','whale'],mix)[0]
            w=('W%d'%rnd.randrange(3)) if t=='whale' else f'{t}{d}_{i}'
            for _ in range(whale_mult if t=='whale' else 1):
                ents.append([w,t,True,rnd.choice(SKL if t=='skilled' else STR if t=='starter' else CAS)])
        for i in range(free_per_day):
            ents.append([f'free{d}_{i}','casual',False,rnd.choice(STR)])
        for i in range(sybil):
            ents.append([f'syb{i}','sybil',False,rnd.choice(CAS)])
        # weights: free releases count at free_weight, and all free combined capped at free_cap of yield
        def eff(e): return e[3]*(1 if e[2] else P['free_weight'])
        tw_paid=sum(eff(e) for e in ents if e[2]); tw_free=sum(eff(e) for e in ents if not e[2])
        free_scale=1.0
        if tw_paid+tw_free>0 and tw_free/(tw_paid+tw_free)>P['free_cap']:
            free_scale=(P['free_cap']*tw_paid/(1-P['free_cap']))/tw_free if tw_free else 1
        W=[eff(e)*(1 if e[2] else free_scale) for e in ents]; TW=sum(W) or 1
        pay=[y_budget*w/TW for w in W]
        # wallet cap: no wallet earns more than wallet_cap of daily yield; excess rolls back to pool
        by={}
        for e,p in zip(ents,pay): by[e[0]]=by.get(e[0],0)+p
        for wk,v in by.items():
            if v>P['wallet_cap']*y_budget:
                f=P['wallet_cap']*y_budget/v
                for i,e in enumerate(ents):
                    if e[0]==wk: bal+=pay[i]*(1-f); pay[i]*=f
        # season bonus: top 3 by season-long alive integral (not end snapshot)
        order=sorted(range(len(ents)),key=lambda i:-W[i])[:3]
        for k,i in enumerate(order):
            if W[i]>0: pay[i]+=b_budget*P['bonus_split'][k]
            else: bal+=b_budget*P['bonus_split'][k]
        for e,p in zip(ents,pay):
            cost=price if e[2] else 0.0
            per_rel.append((e[1],e[2],cost,p,d))
            pl=players.setdefault(e[0],[e[1],0,0]); pl[1]+=cost; pl[2]+=p
        burned.append(price*len([e for e in ents if e[2]])+buyback)
        pc=sum(r[2] for r in per_rel if r[4]==d and r[1]); pp=sum(r[3] for r in per_rel if r[4]==d and r[1]); yavg=pp/pc if pc else yavg
        hist.append(dict(yavg=yavg,day=d,bal=bal,inflow=inflow,out=out,price=price,paid=n_paid,payout=sum(pay)))
        # auto price for tomorrow from trailing 24h: expected payout per paid weight / target ROI
        paid_pay=sum(p for e,p in zip(ents,pay) if e[2]); n=sum(1 for e in ents if e[2])
        price=min(P['p_max'],max(P['p_min'],paid_pay/n/P['target_roi']))
    return hist,per_rel,players,burned
def summarize(per_rel,players,skip=3):
    paid=[r for r in per_rel if r[1] and r[4]>=skip]
    roi=np.array([r[3]/r[2] for r in paid])
    tot=sum(r[3] for r in paid)/sum(r[2] for r in paid)
    def t(ty):
        a=[r for r in paid if r[0]==ty]; return sum(r[3] for r in a)/max(1e-9,sum(r[2] for r in a)) if a else float('nan')
    pr=[v for v in players.values() if v[1]>0]
    return dict(avg_roi=tot,p10=float(np.percentile(roi,10)),p50=float(np.percentile(roi,50)),p90=float(np.percentile(roi,90)),p95=float(np.percentile(roi,95)),
                pct_profit=float((roi>1).mean()*100),casual=t('casual'),starter=t('starter'),skilled=t('skilled'),whale=t('whale'),
                players_profit=100*sum(1 for v in pr if v[2]>v[1])/len(pr))
