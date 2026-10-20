// Territory, hunting tallies and the battle feed. Deterministic: reads only world state, no RNG, no trig.
// Active from cfg.pvpFrom (set once by the server so the existing history replays unchanged).
(function(g){
'use strict';
const ZT=150,FEED=30,HOLD=1.15;
function install(P){const W=P.World.prototype,{CX,CY,R}=P;
  W.lineKey=function(spId){const s=this.species[spId];return this.species[s.root].released?s.root:s.id;};
  W.pvpInit=function(){const z=[];const name=(x,y)=>{const dx=x-CX,dy=y-CY;return Math.abs(dy)>Math.abs(dx)?(dy<0?'North':'South'):(dx>0?'East':'West');};
    const used={};const add=(nm,x,y,r)=>{for(const o of z){const dx=o.x-x,dy=o.y-y;if(dx*dx+dy*dy<(o.r+r)*(o.r+r))return;}used[nm]=(used[nm]||0)+1;z.push({name:used[nm]>1?nm+' II':nm,x,y,r,h:-1,b:0,since:this.tick});};
    add('The Centre',CX,CY,110);
    for(const v of this.vents)add(name(v[0],v[1])+' Vent',v[0],v[1],80);
    const o=R*.7;add('North Shelf',CX,CY-o,105);add('East Shelf',CX+o,CY,105);add('South Shelf',CX,CY+o,105);add('West Shelf',CX-o,CY,105);
    this.pvp={zones:z,feed:[],pair:{},kills:{},season:1};};
  W.onKill=function(k,o){if(!this.pvp)return;const a=this.lineKey(k.sp),b=this.lineKey(o.sp),key=a+'>'+b;this.pvp.pair[key]=(this.pvp.pair[key]||0)+1;this.pvp.kills[a]=(this.pvp.kills[a]||0)+1;};
  W.post=function(e){const f=this.pvp.feed;e.t=this.tick;f.push(e);if(f.length>FEED)f.shift();};
  W.pvpTick=function(){const from=this.cfg.pvpFrom||0;if(this.tick<from)return;if(!this.pvp)this.pvpInit();const pv=this.pvp;
    if(this.tick%this.cfg.epochTicks===0){const ep=this.epochs[this.epochs.length-1];if(ep&&ep.tick===this.tick){ep.kills=Object.assign({},pv.kills);ep.zones=pv.zones.map(z=>[z.name,z.h]);}pv.kills={};pv.season++;this.post({k:'season',n:pv.season});}
    if(this.tick%ZT)return;
    // hunting: report notable predation since the last pass
    const pairs=Object.keys(pv.pair).sort();for(const key of pairs){const n=pv.pair[key];if(n>=5){const [a,b]=key.split('>').map(Number);this.post({k:'hunt',a,b,n});}}pv.pair={};
    // territory: the lineage with the most biomass inside a zone holds it; a challenger needs 15 percent more
    for(const z of pv.zones){const m=new Map(),r2=z.r*z.r;
      for(const c of this.c){const dx=c.x-z.x,dy=c.y-z.y;if(dx*dx+dy*dy<r2){const key=this.lineKey(c.sp);m.set(key,(m.get(key)||0)+c.e);}}
      let best=-1,bb=0;for(const [key,v] of m)if(v>bb||(v===bb&&key<best)){bb=v;best=key;}
      const cur=z.h>=0?(m.get(z.h)||0):0;z.b=Math.round(cur*10)/10;
      if(best>=0&&best!==z.h&&bb>=4&&bb>cur*HOLD){const prev=z.h;z.h=best;z.b=Math.round(bb*10)/10;z.since=this.tick;
        this.post({k:'zone',a:best,b:prev,z:z.name});}
      else if(z.h>=0&&cur===0&&bb<4){this.post({k:'lost',a:z.h,z:z.name});z.h=-1;z.since=this.tick;}}};
  W.zonesOf=function(root){if(!this.pvp)return 0;let n=0;for(const z of this.pvp.zones)if(z.h===root)n++;return n;};
}
if(typeof module!=='undefined')module.exports=install;else install(g.Primordial);
})(typeof window!=='undefined'?window:globalThis);
