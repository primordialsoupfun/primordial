// Primordial deterministic simulation v2. Pure function of (seed, ordered event log).
// Step loop uses only + - * / sqrt and softsign, so results are IEEE-exact across engines.
(function(g){
'use strict';
const R=430,CX=450,CY=450,NI=9,NH=7,NO=3,GLEN=NI*NH+NH+NH*NO+NO,MAXPOP=1100,CELL=24,GW=Math.ceil(900/CELL);
const V5CAP=100,V4FADE=648000; // v4: a released lineage starts at half metabolic cost, back to normal over 6 h
const CFG={epochTicks:3000,prizeShare:0.2,split:[0.5,0.3,0.2]};
class RNG{constructor(s){this.a=s>>>0;}next(){this.a=(this.a+0x6D2B79F5)>>>0;let t=this.a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}}
const act=x=>x/(1+Math.abs(x));
// Compact, exact serialisation of Float32Array: base64 of the raw little-endian bytes. Old checkpoints (plain arrays) still load.
const f32enc=f=>{const b=new Uint8Array(f.buffer,f.byteOffset,f.byteLength);if(typeof Buffer!=='undefined')return Buffer.from(b).toString('base64');let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);};
const f32dec=v=>{if(typeof v!=='string')return Float32Array.from(v);let b;if(typeof Buffer!=='undefined'){const x=Buffer.from(v,'base64');b=new Uint8Array(x.length);b.set(x);}else{const s=atob(v);b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);}return new Float32Array(b.buffer);};
// Skill tree. lock = mutually exclusive branch partner. req = milestone.
const TREE={
  armor1:{branch:'Armor',tier:1,label:'Thick membrane',lock:'loco1',req:{gen:4}},
  armor2:{branch:'Armor',tier:2,label:'Silica plates',need:'armor1',req:{gen:10,pop:25}},
  loco1:{branch:'Locomotion',tier:1,label:'Long flagella',lock:'armor1',req:{gen:4}},
  loco2:{branch:'Locomotion',tier:2,label:'Twin flagella',need:'loco1',req:{gen:10,pop:25}},
  sense1:{branch:'Senses',tier:1,label:'Wide eyespot',req:{gen:3}},
  sense2:{branch:'Senses',tier:2,label:'Antennae',need:'sense1',req:{gen:8,disasters:1}},
  meta1:{branch:'Metabolism',tier:1,label:'Efficient digestion',req:{gen:3}},
  meta2:{branch:'Metabolism',tier:2,label:'Fat vacuoles',need:'meta1',req:{gen:8,pop:30}},
  res1:{branch:'Resistance',tier:1,label:'Cold capsule',req:{disasters:1}},
  res2:{branch:'Resistance',tier:2,label:'Toxin filter',need:'res1',req:{gen:8,disasters:2}},
  pred:{branch:'Diet',tier:2,label:'Predation',lock:'symb',req:{gen:10,pop:30}},
  symb:{branch:'Diet',tier:2,label:'Symbiosis',lock:'pred',req:{gen:6}},
};
const TRAIT_BURN={1:100,2:300}; // test token units per tier
class World{
  constructor(seed,cfg){
    this.cfg=Object.assign({},CFG,cfg||{});this.seed=seed;this.r=new RNG(seed);this.tick=0;this.c=[];this.food=[];this.species=[];this.nextId=1;
    this.cold=0;this.toxic=[];this.craters=[];this.disasters=0;this.epochs=[];
    const r=()=>this.r.next();
    this.vents=[0,1,2].map(()=>this.rp());
    for(let i=0;i<6;i++)this.newSpecies(null,this.randGenome(),null,null);
    for(let i=0;i<520;i++){const s=this.species[i%6];this.spawn(this.mut(s.g,.15),s.id,null,null,1.2);}
    for(let i=0;i<900;i++)this.addFood();
  }
  rnd(){return this.r.next();}
  rp(){for(;;){const x=(this.rnd()*2-1)*R,y=(this.rnd()*2-1)*R;if(x*x+y*y<R*R*.94)return[CX+x,CY+y];}}
  randGenome(){const g=new Float32Array(GLEN);for(let i=0;i<GLEN;i++)g[i]=(this.rnd()*2-1)*1.6;return g;}
  mut(g,s){const n=new Float32Array(g);for(let i=0;i<GLEN;i++){if(this.rnd()<.12)n[i]+=(this.rnd()+this.rnd()+this.rnd()-1.5)*s*2;}return n;}
  newSpecies(parent,g,name,owner){
    const id=this.species.length;
    const base=[[176,124,54],[120,80,52],[96,112,62],[78,96,108],[150,62,48],[58,92,78],[132,108,82],[164,96,70]];
    const b=base[(id*5+(parent?parent.id:0))%base.length];const j=()=>Math.round((this.rnd()-.5)*36);
    const sp={id,parent:parent?parent.id:-1,g:new Float32Array(g),born:this.tick,died:-1,count:0,peak:0,maxGen:0,
      name:name||(parent?parent.name:null),owner:owner||(parent?parent.owner:null),released:!!owner,root:parent?parent.root:id,
      col:[b[0]+j(),b[1]+j(),b[2]+j()],traits:parent?parent.traits.slice():[],disastersSurvived:parent?parent.disastersSurvived:0};
    if(parent&&parent.name)sp.name=parent.name;
    this.species.push(sp);return sp;
  }
  // v3 rules switch on at cfg.v3From, a fixed tick recorded by the server, so earlier history replays unchanged.
  v3(){const f=this.cfg.v3From;return f!=null&&this.tick>=f;}
  v5(){const f=this.cfg.v5bFrom;return f!=null&&this.tick>=f;}
  v4(){const f=this.cfg.v4From;return f!=null&&this.tick>=f;}
  // A release starts from a proven brain: a mutated copy of a creature from the most populous living species.
  provenGenome(){let best=null;for(const s of this.species)if(s.count>0&&(!best||s.count>best.count))best=s;if(!best)return this.randGenome();
    const ms=[];for(const k of this.c)if(k.sp===best.id)ms.push(k);const k=ms[(this.rnd()*ms.length)|0];return this.mut(k.g,.05);}
  has(sp,t){return this.species[sp].traits.indexOf(t)>=0;}
  spawn(g,sp,x,y,e){
    if(this.c.length>=MAXPOP)return null;
    if(x==null){[x,y]=this.rp();}
    const a=this.rnd()*2-1,b=this.rnd()*2-1,l=Math.sqrt(a*a+b*b)||1;
    const k={id:this.nextId++,x,y,dx:a/l,dy:b/l,v:0,e:e||1,age:0,g,sp,act:new Float32Array(NI+NH+NO),gen:0};
    this.c.push(k);return k;
  }
  addFood(x,y,v){if(x==null)[x,y]=this.rp();const dx=x-CX,dy=y-CY;if(dx*dx+dy*dy>R*R*.97)return;this.food.push({x,y,v:v||.45});}
  // eligibility of a trait for a root species (released lineage)
  eligible(spId,t){const S=this.species[spId],T=TREE[t];if(!T||S.traits.indexOf(t)>=0)return false;
    if(T.need&&S.traits.indexOf(T.need)<0)return false;if(T.lock&&S.traits.indexOf(T.lock)>=0)return false;
    const st=this.lineageStats(S.root),q=T.req;
    if(q.gen&&st.maxGen<q.gen)return false;if(q.pop&&st.alive<q.pop)return false;if(q.disasters&&S.disastersSurvived<q.disasters)return false;return true;}
  lineageStats(root){let alive=0,maxGen=0;for(const k of this.c){if(this.species[k.sp].root===root){alive++;if(k.gen>maxGen)maxGen=k.gen;}}return{alive,maxGen};}
  apply(ev){
    const r=()=>this.rnd();ev.ok=true;
    if(ev.type==='food'){let cx=ev.x,cy=ev.y;if(cx==null)[cx,cy]=this.rp();for(let i=0;i<260;i++){const a=r()*2-1,b=r()*2-1;if(a*a+b*b>1)continue;this.addFood(cx+a*80,cy+b*80,.5);}}
    if(ev.type==='meteor'){let cx=ev.x,cy=ev.y;if(cx==null)[cx,cy]=this.rp();const rr=110;this.disasters++;
      this.c=this.c.filter(k=>{const dx=k.x-cx,dy=k.y-cy;if(dx*dx+dy*dy>rr*rr)return true;if(this.shielded(k))return true;const p=this.has(k.sp,'armor2')?.55:this.has(k.sp,'armor1')?.3:0;return r()<p;});
      this.food=this.food.filter(f=>{const dx=f.x-cx,dy=f.y-cy;return dx*dx+dy*dy>rr*rr;});this.craters.push({x:cx,y:cy,r:rr,t:this.tick});this.markSurvivors();}
    if(ev.type==='cold'){this.cold=700;this.disasters++;this.pendingSurvive=this.tick+700;}
    if(ev.type==='toxic'){let cx=ev.x,cy=ev.y;if(cx==null)[cx,cy]=this.rp();this.toxic.push({x:cx,y:cy,r:140,until:this.tick+1200});this.disasters++;this.pendingSurvive=this.tick+1200;}
    if(ev.type==='release'){const sp=this.newSpecies(null,this.v3()?this.provenGenome():this.randGenome(),String(ev.name||'Unnamed').slice(0,24),ev.owner||'anon');
      let cx=ev.x,cy=ev.y;if(cx==null)[cx,cy]=this.rp();ev.sp=sp.id;if(ev.shield)sp.shieldUntil=this.tick+ev.shield;
      if(this.v4())sp.bornTick=this.tick;
      for(let i=0;i<40;i++)this.spawn(this.mut(sp.g,.1),sp.id,cx+(r()-.5)*60,cy+(r()-.5)*60,1.4);}
    if(ev.type==='trait'){const S=this.species[ev.sp];
      if(!S||S.owner!==ev.owner||S.root!==S.id||!this.eligible(ev.sp,ev.trait)){ev.ok=false;return;}
      for(const s of this.species)if(s.root===S.id&&s.traits.indexOf(ev.trait)<0)s.traits.push(ev.trait);}
  }
  // newborn protection: a released lineage carrying a shield ignores disasters until shieldUntil (set only by events that carry ev.shield)
  shielded(k){const S=this.species[this.species[k.sp].root];return S.shieldUntil>this.tick;}
  markSurvivors(){for(const s of this.species)if(s.count>0)s.disastersSurvived++;}
  grid(list){const G=new Map();for(let i=0;i<list.length;i++){const o=list[i];const key=((o.x/CELL)|0)*GW+((o.y/CELL)|0);let a=G.get(key);if(!a)G.set(key,a=[]);a.push(i);}return G;}
  sense(G,list,x,y,rad,cb){const x0=((x-rad)/CELL)|0,x1=((x+rad)/CELL)|0,y0=((y-rad)/CELL)|0,y1=((y+rad)/CELL)|0;let s=0;
    for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const a=G.get(gx*GW+gy);if(!a)continue;for(const i of a){const o=list[i];const dx=o.x-x,dy=o.y-y,d=dx*dx+dy*dy;if(d<rad*rad)s+=cb?cb(o,i,d):1;}}return s;}
  step(events){
    if(events)for(const ev of events)this.apply(ev);
    this.tick++;const r=()=>this.rnd();
    const cold=this.cold>0?1:0;if(this.cold>0)this.cold--;
    // natural algae: base regrowth everywhere, extra at thermal vents, reduced by cold
    if(this.food.length<1500){const n=cold?1:3;for(let i=0;i<n;i++)this.addFood();
      for(const v of this.vents){if(r()<(cold?.12:.35)){const a=r()*2-1,b=r()*2-1;this.addFood(v[0]+a*50,v[1]+b*50,.55);}}}
    if(this.pendingSurvive&&this.tick>=this.pendingSurvive){this.pendingSurvive=0;this.markSurvivors();}
    const FG=this.grid(this.food),CG=this.grid(this.c);
    const eaten=new Uint8Array(this.food.length),dead=new Uint8Array(this.c.length);
    this.toxic=this.toxic.filter(t=>t.until>this.tick);
    const born=[];const v4sh=this.v4();
    // v5: the head start applies only while the released lineage has fewer than V5CAP creatures (stops one release taking over the dish)
    let LC=null;if(v4sh&&this.v5()){LC=new Map();for(const k of this.c){const ro=this.species[k.sp].root;LC.set(ro,(LC.get(ro)||0)+1);}}
    for(let ci=0;ci<this.c.length;ci++){const k=this.c[ci];if(dead[ci])continue;const T=this.species[k.sp].traits,h=t=>T.indexOf(t)>=0;
      const sr=h('sense1')?(h('sense2')?24:19):14,reach=h('sense2')?22:16;
      const lx=k.x+(k.dx*reach-k.dy*10),ly=k.y+(k.dy*reach+k.dx*10),rx=k.x+(k.dx*reach+k.dy*10),ry=k.y+(k.dy*reach-k.dx*10);
      const fl=this.sense(FG,this.food,lx,ly,sr),fr=this.sense(FG,this.food,rx,ry,sr);
      const nl=this.sense(CG,this.c,lx,ly,14),nr=this.sense(CG,this.c,rx,ry,14);
      let tox=0;for(const t of this.toxic){const dx=k.x-t.x,dy=k.y-t.y;if(dx*dx+dy*dy<t.r*t.r)tox=1;}
      const ox=k.x-CX,oy=k.y-CY,wall=(ox*ox+oy*oy)/(R*R);
      const I=k.act;I[0]=fl*.25;I[1]=fr*.25;I[2]=nl*.3;I[3]=nr*.3;I[4]=k.e-1;I[5]=cold;I[6]=tox;I[7]=wall;I[8]=1;
      const G=k.g;let p=0;
      for(let hh=0;hh<NH;hh++){let s=G[NI*NH+hh];for(let i=0;i<NI;i++)s+=I[i]*G[p++];I[NI+hh]=act(s);}
      p=NI*NH+NH;for(let o=0;o<NO;o++){let s=G[p+NH*NO+o];for(let hh=0;hh<NH;hh++)s+=I[NI+hh]*G[p+o*NH+hh];I[NI+NH+o]=act(s);}
      const turn=I[NI+NH]*.22,thrust=(I[NI+NH+1]+1)*.5;
      let ndx=k.dx-turn*k.dy,ndy=k.dy+turn*k.dx;const l=Math.sqrt(ndx*ndx+ndy*ndy);k.dx=ndx/l;k.dy=ndy/l;
      const sp=(h('loco1')?1.2:1)*(h('loco2')?1.15:1)*(h('armor1')?.85:1)*(h('armor2')?.9:1);
      k.v=k.v*.8+thrust*.55*sp;k.x+=k.dx*k.v;k.y+=k.dy*k.v;
      const nx=k.x-CX,ny=k.y-CY,d2=nx*nx+ny*ny;
      if(d2>R*R){const d=Math.sqrt(d2);k.x=CX+nx/d*R;k.y=CY+ny/d*R;k.dx=-k.dx;k.dy=-k.dy;}
      const base=.0016*(h('meta1')?.8:1)*(h('armor2')?1.15:1),move=thrust*.0022*(h('loco1')?1.1:1)*(h('meta2')?.9:1);
      const shd=(cold||tox)&&this.shielded(k),coldC=shd?0:cold*.0024*(h('res1')?.4:1),toxC=shd?0:tox*.009*(h('res2')?.35:1);
      let symb=0;if(h('symb'))symb=Math.min(.0008,(nl+nr)*.00015);
      let starve=1;if(v4sh){const RS=this.species[this.species[k.sp].root];if(RS.bornTick!=null){const a=this.tick-RS.bornTick;if(a<V4FADE&&(!LC||LC.get(RS.id)<V5CAP))starve=.5+.5*a/V4FADE;}}
      k.e-=(base+move)*starve+coldC+toxC-symb;
      const gain=h('pred')?.75:1; // predators digest algae less well
      this.sense(FG,this.food,k.x,k.y,5,(f,i)=>{if(!eaten[i]){eaten[i]=1;k.e+=f.v*gain;}return 0;});
      if(h('pred')&&k.e<1.6){this.sense(CG,this.c,k.x,k.y,6,(o,i)=>{if(i!==ci&&!dead[i]&&o.sp!==k.sp&&this.species[o.sp].root!==this.species[k.sp].root&&o.e<k.e&&!(this.has(o.sp,'armor2')&&r()<.5)){dead[i]=1;k.e+=Math.min(.6,o.e*.6);if(this.pvp)this.onKill(k,o);}return 0;});}
      k.age++;
      const repro=h('meta2')?2.1:1.9;
      if(k.e>repro){k.e=k.e*.5-.02;born.push(k);}
    }
    if(eaten.some(v=>v))this.food=this.food.filter((f,i)=>!eaten[i]);
    if(dead.some(v=>v))this.c=this.c.filter((k,i)=>!dead[i]);
    for(const p of born){
      const g=this.mut(p.g,.18);let sp=p.sp;const S=this.species[sp];
      let d=0;for(let i=0;i<GLEN;i++){const q=g[i]-S.g[i];d+=q*q;}
      if(d>GLEN*.022)sp=this.newSpecies(S,g,null,null).id;
      const ch=this.spawn(g,sp,p.x-p.dx*4,p.y-p.dy*4,p.e);if(ch){ch.gen=p.gen+1;ch.dx=-p.dy;ch.dy=p.dx;}
    }
    this.c=this.c.filter(k=>k.e>0&&k.age<3500);
    if(this.c.length<60){const s=this.species[(r()*this.species.length)|0];for(let i=0;i<40;i++)this.spawn(this.mut(s.g,.3),s.id);}
    for(const s of this.species){s.count=0;}for(const k of this.c){const s=this.species[k.sp];s.count++;if(k.gen>s.maxGen)s.maxGen=k.gen;}
    for(const s of this.species){if(s.count>s.peak)s.peak=s.count;if(s.count===0&&s.died<0&&s.peak>0)s.died=this.tick;if(s.count>0)s.died=-1;}
    if(this.tick%this.cfg.epochTicks===0)this.closeEpoch();
    if(this.pvpTick)this.pvpTick();
  }
  // Released-species score: descendants alive across the whole lineage + survival time.
  scores(){const out=[];for(const s of this.species){if(!s.released||s.root!==s.id)continue;
      const st=this.lineageStats(s.id);if(st.alive===0)continue;out.push({sp:s.id,name:s.name,owner:s.owner,alive:st.alive,ticks:this.tick-s.born,score:st.alive*10+Math.floor((this.tick-s.born)/100)});}
    // territory and hunting, display only: payout math lives in economy.js and is not changed here (it can read W.zonesOf(root))
    if(this.pvp)for(const o of out){o.zones=this.zonesOf(o.sp);o.kills=this.pvp.kills[o.sp]||0;}
    out.sort((a,b)=>b.score-a.score||a.sp-b.sp);return out;}
  closeEpoch(){const sc=this.scores().slice(0,this.cfg.split.length);this.epochs.push({epoch:this.epochs.length+1,tick:this.tick,winners:sc.map((w,i)=>Object.assign({},w,{place:i+1,share:this.cfg.split[i]}))});}
  hash(){let h=0x811c9dc5;const mix=v=>{h^=v&0xffffffff;h=Math.imul(h,16777619)>>>0;};
    for(const k of this.c){mix(k.id);mix(Math.round(k.x*100));mix(Math.round(k.y*100));mix(Math.round(k.e*1e4));}
    mix(this.food.length);mix(this.species.length);return('0000000'+h.toString(16)).slice(-8);}
  // Everything except species; species are added by the caller so no full extra copy of them is built.
  baseJSON(){const o={};for(const key of Object.keys(this)){if(key==='r')o.r=this.r.a;else if(key!=='species')o[key]=this[key];}
    o.c=this.c.map(k=>Object.assign({},k,{g:f32enc(k.g),act:f32enc(k.act)}));return o;}
  static spJSON(s){return Object.assign({},s,{g:f32enc(s.g)});}
  toJSON(){const o=this.baseJSON();o.species=this.species.map(World.spJSON);return o;}
  // Client snapshot: long-dead wild species (no living members, not a lineage root) are sent without genome, and small ones as a compact row.
  // Their genome is only read by the rare emergency respawn (fewer than 60 organisms); a client that hits it fails the hash check and reloads.
  toLite(){const o=this.baseJSON();o.species=this.species.map(s=>{if(s.count>0||s.root===s.id||s.released)return Object.assign({},s,{g:f32enc(s.g)});
      if(s.peak<6)return [s.parent,s.born,s.died,s.peak,s.maxGen,s.root,s.col[0],s.col[1],s.col[2],s.disastersSurvived];const x=Object.assign({},s);delete x.g;return x;});return o;}
  static fromJSON(o){const w=Object.create(World.prototype);Object.assign(w,o);w.r=new RNG(0);w.r.a=o.r;
    w.c=o.c.map(k=>Object.assign({},k,{g:f32dec(k.g),act:f32dec(k.act)}));
    const src=o.species;w.species=[];src.forEach((s,id)=>{src[id]=null;if(Array.isArray(s)){const R=w.species[s[5]]||{};s={id,parent:s[0],born:s[1],died:s[2],count:0,peak:s[3],maxGen:s[4],name:R.name||null,owner:R.owner||null,released:false,root:s[5],col:[s[6],s[7],s[8]],traits:(R.traits||[]).slice(),disastersSurvived:s[9]};}
      const R=w.species[s.root];w.species.push(Object.assign({},s,{g:s.g!=null?f32dec(s.g):new Float32Array(R&&R.g?R.g:GLEN)}));});return w;}
}
g.Primordial={World,R,CX,CY,NI,NH,NO,TREE,TRAIT_BURN,CFG};
if(typeof module!=='undefined'){module.exports=g.Primordial;require('./pvp.js')(g.Primordial);}
})(typeof window!=='undefined'?window:globalThis);
