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
    const v2=this.cfg.pvp2From!=null?this.cfg.pvp2From:(this.cfg.pvpFrom>0?Infinity:0);if(pv.v!==2&&this.tick>=v2)this.pvp2Init();
    if(this.tick%ZT)return;
    // hunting: report notable predation since the last pass
    const pairs=Object.keys(pv.pair).sort();for(const key of pairs){const n=pv.pair[key];if(n>=5){const [a,b]=key.split('>').map(Number);this.post({k:'hunt',a,b,n});}}pv.pair={};
    // territory: the lineage with the most biomass inside a zone holds it; a challenger needs 15 percent more
    if(pv.v===2)this.territory2();else for(const z of pv.zones){const m=new Map(),r2=z.r*z.r;
      for(const c of this.c){const dx=c.x-z.x,dy=c.y-z.y;if(dx*dx+dy*dy<r2){const key=this.lineKey(c.sp);m.set(key,(m.get(key)||0)+c.e);}}
      let best=-1,bb=0;for(const [key,v] of m)if(v>bb||(v===bb&&key<best)){bb=v;best=key;}
      const cur=z.h>=0?(m.get(z.h)||0):0;z.b=Math.round(cur*10)/10;
      if(best>=0&&best!==z.h&&bb>=4&&bb>cur*HOLD){const prev=z.h;z.h=best;z.b=Math.round(bb*10)/10;z.since=this.tick;
        this.post({k:'zone',a:best,b:prev,z:z.name});}
      else if(z.h>=0&&cur===0&&bb<4){this.post({k:'lost',a:z.h,z:z.name});z.h=-1;z.since=this.tick;}}};
  // ---- v2: land-like zones. Noise-warped Voronoi on integer math, sampled into a 60x60 lookup grid (15 px cells).
  const ih=(x,y,s)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,1442695041);h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0;};
  const vnoise=(x,y,L,A,s)=>{const ix=Math.floor(x/L),iy=Math.floor(y/L),fx=x-ix*L,fy=y-iy*L,v=(i,j)=>(ih(i,j,s)%(2*A+1))-A;
    const top=v(ix,iy)*(L-fx)+v(ix+1,iy)*fx,bot=v(ix,iy+1)*(L-fx)+v(ix+1,iy+1)*fx;return Math.floor((top*(L-fy)+bot*fy)/(L*L));};
  const DIRS=[['Northern Shelf',0,-1000],['Amber Reach',707,-707],['Eastern Flats',1000,0],['Salt Shallows',707,707],['Southern Shelf',0,1000],['Ash Reach',-707,707],['Western Flats',-1000,0],['Cold Shallows',-707,-707]];
  W.zoneSites=function(){const z=[],name=(x,y)=>{const dx=x-CX,dy=y-CY;return Math.abs(dy)>Math.abs(dx)?(dy<0?'North':'South'):(dx>0?'East':'West');};const used={};
    const add=(nm,x,y,gap)=>{for(const o of z){const dx=o.x-x,dy=o.y-y;if(dx*dx+dy*dy<gap*gap)return;}used[nm]=(used[nm]||0)+1;z.push({name:used[nm]>1?nm+' II':nm,x,y});};
    add('The Centre',CX,CY,0);for(const v of this.vents)add(name(v[0],v[1])+' Vent',Math.round(v[0]),Math.round(v[1]),150);
    for(const [nm,ux,uy] of DIRS)add(nm,CX+Math.round(ux*300/1000),CY+Math.round(uy*300/1000),170);return z;};
  // zone index at an integer point, 255 outside the dish
  W.zoneAtPoint=function(x,y,sites){x=Math.round(x);y=Math.round(y);const dx=x-CX,dy=y-CY;if(dx*dx+dy*dy>R*R)return 255;const sd=this.seed|0;
    const wx=x+vnoise(x,y,150,72,sd)+vnoise(x,y,46,20,sd+7),wy=y+vnoise(x,y,150,72,sd+13)+vnoise(x,y,46,20,sd+21);
    let best=0,bd=Infinity;for(let i=0;i<sites.length;i++){const a=wx-sites[i].x,b=wy-sites[i].y,d=a*a+b*b;if(d<bd){bd=d;best=i;}}return best;};
  W.zoneGrid=function(){if(this._zg)return this._zg;const sites=this.pvp.zones,G=new Uint8Array(3600);
    for(let gy=0;gy<60;gy++)for(let gx=0;gx<60;gx++)G[gy*60+gx]=this.zoneAtPoint(gx*15+7,gy*15+7,sites);
    Object.defineProperty(this,'_zg',{value:G,enumerable:false,writable:true,configurable:true});return G;};
  W.zoneIndex=function(x,y){if(!this.pvp||this.pvp.v!==2)return 255;let gx=(x/15)|0,gy=(y/15)|0;gx=gx<0?0:gx>59?59:gx;gy=gy<0?0:gy>59?59:gy;return this.zoneGrid()[gy*60+gx];};
  W.pvp2Init=function(){const pv=this.pvp;pv.v=2;pv.zones=this.zoneSites().map(z=>Object.assign(z,{h:-1,b:0,since:this.tick,cx:z.x,cy:z.y,cells:0}));this._zg=null;
    const G=this.zoneGrid(),sx=pv.zones.map(()=>0),sy=pv.zones.map(()=>0);
    for(let i=0;i<3600;i++){const z=G[i];if(z===255)continue;pv.zones[z].cells++;sx[z]+=(i%60)*15+7;sy[z]+=Math.floor(i/60)*15+7;}
    pv.zones.forEach((z,i)=>{if(z.cells){z.cx=Math.floor(sx[i]/z.cells);z.cy=Math.floor(sy[i]/z.cells);}});this.post({k:'map'});};
  W.territory2=function(){const pv=this.pvp,Z=pv.zones,M=Z.map(()=>new Map());
    for(const c of this.c){const zi=this.zoneIndex(c.x,c.y);if(zi===255)continue;const key=this.lineKey(c.sp),m=M[zi];m.set(key,(m.get(key)||0)+Math.round(c.e*1000));}
    Z.forEach((z,i)=>{const m=M[i];let best=-1,bb=0;for(const [key,v] of m)if(v>bb||(v===bb&&key<best)){bb=v;best=key;}
      const cur=z.h>=0?(m.get(z.h)||0):0;z.b=cur;
      if(best>=0&&best!==z.h&&bb>=4000&&bb*100>cur*115){const prev=z.h;z.h=best;z.b=bb;z.since=this.tick;this.post({k:'zone',a:best,b:prev,z:z.name});}
      else if(z.h>=0&&cur===0&&bb<4000){this.post({k:'lost',a:z.h,z:z.name});z.h=-1;z.since=this.tick;}});};
  W.zonesOf=function(root){if(!this.pvp)return 0;let n=0;for(const z of this.pvp.zones)if(z.h===root)n++;return n;};
}
if(typeof module!=='undefined')module.exports=install;else install(g.Primordial);
})(typeof window!=='undefined'?window:globalThis);
