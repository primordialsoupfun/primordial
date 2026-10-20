import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
INK,RUST,PAPER='#1a1714','#c2502a','#f4efe6'
fig=plt.figure(figsize=(10,12),facecolor=PAPER); ax=fig.add_axes([0,0,1,1]); ax.axis('off'); ax.set_xlim(0,10); ax.set_ylim(0,12)
T=lambda x,y,s,**k: ax.text(x,y,s,color=k.pop('c',INK),family='DejaVu Sans',**k)
T(5,11.4,'You burn $5 of SOUP to release a creature.',ha='center',fontsize=20,weight='bold')
T(5,10.9,'Here is what usually happens (simulated, medium-size game)',ha='center',fontsize=12)
bars=[('Unlucky 1 in 10',1.70),('Typical player',3.55),('Lucky 1 in 10',7.85),('Casual player, avg',2.95),('Recommended start, avg',6.25),('Skilled player, avg',8.35)]
for i,(lab,v) in enumerate(bars):
    y=10.0-i*0.72; ax.add_patch(FancyBboxPatch((3.2,y-.3),v*0.45,.5,boxstyle='round,pad=0.02',fc=RUST if v>=5 else INK,ec='none'))
    T(3.0,y,lab,ha='right',va='center',fontsize=12); T(3.3+v*.45,y,f'gets back ${v:.2f}',va='center',fontsize=12,weight='bold')
ax.plot([5.45,5.45],[6.0,10.3],ls='--',c=INK,lw=1); T(5.45,10.45,'$5 paid',ha='center',fontsize=10)
T(5,5.6,'About 1 in 3 players make a profit. Most lose some. 1 in 20 gets back $21 or more.',ha='center',fontsize=12)
T(5,5.2,'Skill and attention matter. Recommended start helps, unlocking traits helps more.',ha='center',fontsize=12)
T(5,4.5,'Where the money comes from',ha='center',fontsize=16,weight='bold')
def box(x,y,w,s,fc=INK): ax.add_patch(FancyBboxPatch((x,y),w,.8,boxstyle='round,pad=0.05',fc=fc,ec='none')); T(x+w/2,y+.4,s,ha='center',va='center',fontsize=10.5,c=PAPER)
box(.3,3.1,2.9,'Trading fees (70%)'); box(3.55,3.1,2.9,'Disaster and food buys (40%)'); box(6.8,3.1,2.9,'Your $5 release'); 
box(1.9,1.6,3.2,'Prize pool',RUST); box(6.8,1.6,2.9,'Burned forever')
for x in (1.75,5.0): ax.annotate('',xy=(3.5,2.45),xytext=(x,3.05),arrowprops=dict(arrowstyle='-|>',color=INK))
ax.annotate('',xy=(8.25,2.45),xytext=(8.25,3.05),arrowprops=dict(arrowstyle='-|>',color=INK))
ax.annotate('',xy=(7.6,2.45),xytext=(5.6,3.05),arrowprops=dict(arrowstyle='-|>',color=INK)); T(6.9,2.85,'other 60%',fontsize=9)
T(3.5,1.1,'Paid out every hour to creatures that are alive,',ha='center',fontsize=10.5); T(3.5,.75,'more for the longer they live.',ha='center',fontsize=10.5)
T(5,.25,'Simulation only, not a promise. Real results depend on how many people play.',ha='center',fontsize=9,style='italic')
fig.savefig('simple_infographic.png',dpi=110,facecolor=PAPER)
